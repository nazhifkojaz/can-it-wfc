"""
Tests for core stats utilities (cafe insights computation).
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.cafes.models import Cafe
from apps.reviews.models import Visit, Review
from apps.core.stats_utils import (
    _compute_ratings,
    _compute_rating_distribution,
    _compute_spend,
    _compute_time_of_day,
    _compute_day_of_week,
    _compute_recent_activity,
    _compute_google_delta,
    _compute_cadence_days,
    _median,
    compute_cafe_insights,
    recompute_cafe_insights,
)

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
    )


@pytest.fixture
def cafe(user):
    return Cafe.objects.create(
        name='Test Cafe',
        address='123 Test St',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id='test_place',
        google_rating=Decimal('4.3'),
        google_ratings_count=100,
        created_by=user,
    )


def _make_review(cafe, user, wifi=3, power=3, noise=3, seating=3, **kwargs):
    r = Review.objects.create(
        cafe=cafe,
        user=user,
        wifi_quality=wifi,
        power_outlets_rating=power,
        noise_level=noise,
        seating_comfort=seating,
        **{k: v for k, v in kwargs.items() if k != 'wfc'},
    )
    return r


def _make_visit(cafe, user, visit_date=None, amount_spent=None, currency='USD', visit_time=None):
    if visit_date is None:
        visit_date = timezone.now().date()
    return Visit.objects.create(
        cafe=cafe,
        user=user,
        visit_date=visit_date,
        amount_spent=amount_spent,
        currency=currency,
        visit_time=visit_time,
    )


class TestMedian:
    def test_median_odd(self):
        assert _median([1, 2, 3, 4, 5]) == 3

    def test_median_even(self):
        assert _median([1, 2, 3, 4]) == 2.5

    def test_median_single(self):
        assert _median([7]) == 7

    def test_median_empty(self):
        assert _median([]) == 0


@pytest.mark.django_db
class TestComputeRatings:
    def test_returns_none_for_empty_reviews(self):
        assert _compute_ratings([]) is None

    def test_computes_averages(self, cafe, user):
        u1 = User.objects.create_user(username='avg1', email='avg1@test.com', password='pass')
        u2 = User.objects.create_user(username='avg2', email='avg2@test.com', password='pass')
        _make_review(cafe, u1, wifi=2, power=5, noise=4, seating=3)
        _make_review(cafe, u2, wifi=4, power=3, noise=2, seating=5)
        result = _compute_ratings(list(Review.objects.filter(cafe=cafe)))
        assert result is not None
        assert result['wifi']['avg'] == 3.0
        assert result['power']['avg'] == 4.0
        assert result['noise']['avg'] == 3.0
        assert result['seating']['avg'] == 4.0

    def test_handles_none_power_rating(self, cafe, user):
        _make_review(cafe, user, power=None)
        result = _compute_ratings(list(Review.objects.filter(cafe=cafe)))
        assert result is not None
        assert result['power']['avg'] is None
        assert result['power']['n'] == 0


@pytest.mark.django_db
class TestComputeRatingDistribution:
    def test_returns_none_below_threshold(self, cafe, user):
        result = _compute_rating_distribution(list(Review.objects.filter(cafe=cafe)))
        assert result is None

    def test_returns_distribution_with_enough_reviews(self, cafe, user):
        for i in range(10):
            u = User.objects.create_user(username=f'user_{i}', email=f'user{i}@test.com',
                                         password='pass')
            _make_review(cafe, u, wifi=(i % 5) + 1)
        reviews = list(Review.objects.filter(cafe=cafe))
        result = _compute_rating_distribution(reviews)
        assert result is not None
        assert 'distribution' in result
        assert sum(result['distribution'].values()) == 10
        assert 'consistency' in result

    def test_suppresses_for_high_mean_low_stddev(self, cafe, user):
        for i in range(10):
            u = User.objects.create_user(username=f'cons_{i}', email=f'cons{i}@test.com',
                                         password='pass')
            _make_review(cafe, u, wifi=5, power=5, noise=5, seating=5)
        reviews = list(Review.objects.filter(cafe=cafe))
        result = _compute_rating_distribution(reviews)
        assert result is None


@pytest.mark.django_db
class TestComputeSpend:
    def test_returns_none_for_no_visits(self, cafe):
        assert _compute_spend(cafe) is None

    def test_returns_none_for_visits_without_amount(self, cafe, user):
        _make_visit(cafe, user)
        assert _compute_spend(cafe) is None

    def test_computes_primary_currency_median(self, cafe, user):
        today = timezone.now().date()
        _make_visit(cafe, user, visit_date=today, amount_spent=Decimal('5.00'), currency='USD')
        _make_visit(cafe, user, visit_date=today - timedelta(days=1), amount_spent=Decimal('10.00'), currency='USD')
        _make_visit(cafe, user, visit_date=today - timedelta(days=2), amount_spent=Decimal('15.00'), currency='USD')
        result = _compute_spend(cafe)
        assert result is not None
        assert result['primary']['currency'] == 'USD'
        assert result['primary']['median'] == 10.0
        assert result['primary']['n'] == 3


@pytest.mark.django_db
class TestComputeTimeOfDay:
    def test_returns_none_when_below_threshold(self, cafe):
        assert _compute_time_of_day(cafe, []) is None

    def test_computes_distribution(self, cafe, user):
        today = timezone.now().date()
        for i in range(5):
            _make_visit(cafe, user, visit_date=today - timedelta(days=i * 2), visit_time=1)
            _make_visit(cafe, user, visit_date=today - timedelta(days=i * 2 + 1), visit_time=2)
        reviews = list(Review.objects.filter(cafe=cafe))
        result = _compute_time_of_day(cafe, reviews)
        assert result is not None
        assert 'distribution' in result
        assert 'morning' in result['distribution']
        assert 'afternoon' in result['distribution']


@pytest.mark.django_db
class TestComputeDayOfWeek:
    def test_returns_none_below_threshold(self, cafe):
        assert _compute_day_of_week(cafe) is None

    def test_computes_weekday_share(self, cafe, user):
        today = timezone.now().date()
        for i in range(10):
            _make_visit(cafe, user, visit_date=today - timedelta(days=i * 3))
        result = _compute_day_of_week(cafe)
        assert result is not None
        assert 'weekday_share' in result
        assert 'weekend_share' in result
        assert 'label' in result
        assert result['n'] == 10


@pytest.mark.django_db
class TestComputeRecentActivity:
    def test_counts_recent_visits(self, cafe, user):
        today = timezone.now().date()
        _make_visit(cafe, user, visit_date=today)
        result = _compute_recent_activity(cafe)
        assert result is not None
        assert result['visits_last_30d'] >= 0
        assert 'as_of' in result


@pytest.mark.django_db
class TestComputeGoogleDelta:
    def test_returns_none_when_no_wfc_rating(self, cafe):
        assert _compute_google_delta(cafe) is None

    def test_returns_delta_when_both_ratings_present(self, cafe, user):
        u1 = User.objects.create_user(username='gdlta', email='gdlta@test.com', password='pass')
        _make_review(cafe, u1)
        cafe.average_wfc_rating = Decimal('2.0')
        cafe.save(update_fields=['average_wfc_rating'])
        result = _compute_google_delta(cafe)
        assert result is not None
        assert 'wfc' in result
        assert 'google' in result
        assert 'delta' in result

    def test_returns_none_for_small_delta(self, cafe, user):
        u1 = User.objects.create_user(username='smlta', email='smlta@test.com', password='pass')
        _make_review(cafe, u1)
        cafe.average_wfc_rating = Decimal('4.3')
        cafe.google_rating = Decimal('4.3')
        cafe.save(update_fields=['average_wfc_rating', 'google_rating'])
        assert _compute_google_delta(cafe) is None


@pytest.mark.django_db
class TestComputeCadenceDays:
    def test_returns_none_below_min_intervals(self, cafe, user):
        from apps.reviews.models import Visit as VModel
        base_qs = VModel.objects.filter(cafe=cafe)
        cutoff = timezone.now().date() - timedelta(days=90)
        thresholds = {'CADENCE_MIN_INTERVALS': 5}
        assert _compute_cadence_days(base_qs, cutoff, thresholds) is None


@pytest.mark.django_db
class TestComputeCafeInsights:
    def test_returns_version_at_minimum(self, cafe):
        insights = compute_cafe_insights(cafe, [])
        assert insights['version'] == 5

    def test_returns_version_and_activity_with_empty_data(self, cafe):
        insights = compute_cafe_insights(cafe, [])
        assert insights['version'] == 5
        assert 'recent_activity' in insights
        assert insights['recent_activity']['visits_last_30d'] == 0

    def test_includes_ratings_when_available(self, cafe, user):
        _make_review(cafe, user, wifi=4, power=5, noise=2, seating=3)
        reviews = list(Review.objects.filter(cafe=cafe))
        insights = compute_cafe_insights(cafe, reviews)
        assert 'ratings' in insights

    def test_includes_google_delta(self, cafe, user):
        u1 = User.objects.create_user(username='gdltb', email='gdltb@test.com', password='pass')
        _make_review(cafe, u1)
        reviews = list(Review.objects.filter(cafe=cafe))
        cafe.average_wfc_rating = Decimal('2.0')
        cafe.save(update_fields=['average_wfc_rating'])
        insights = compute_cafe_insights(cafe, reviews)
        assert 'google_delta' in insights


@pytest.mark.django_db
class TestRecomputeCafeInsights:
    def test_saves_insights_to_cafe(self, cafe, user):
        _make_review(cafe, user, wifi=3, power=3, noise=3, seating=3)
        reviews = list(Review.objects.filter(cafe=cafe))
        recompute_cafe_insights(cafe, recent_reviews=reviews)
        cafe.refresh_from_db()
        assert cafe.insights_cache is not None
        assert 'version' in cafe.insights_cache
        assert cafe.insights_cache_computed_at is not None
