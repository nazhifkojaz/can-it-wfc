import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from apps.cafes.models import Cafe, CafeList, CafeListItem
from apps.reviews.models import Review, Visit

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
    )


@pytest.fixture
def test_cafe(db, test_user):
    return Cafe.objects.create(
        name='Coffee Lab',
        address='Jl. Senopati, Jakarta Selatan',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id='place_1',
        created_by=test_user,
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    api_client.force_authenticate(user=test_user)
    return api_client


def _make_review(user, cafe, wfc_rating=4, comment='Great place', visit_time=None):
    return Review.objects.create(
        user=user,
        cafe=cafe,
        wifi_quality=4,
        noise_level=3,
        seating_comfort=4,
        wfc_rating=wfc_rating,
        comment=comment,
        visit_time=visit_time,
    )


def _make_user(username, email=None):
    if email is None:
        email = f'{username}@example.com'
    return User.objects.create_user(username=username, email=email, password='pass123')


@pytest.mark.django_db
class TestRecentReviews:
    """Tests for GET /api/discover/recent-reviews/"""

    ENDPOINT = '/api/discover/recent-reviews/'

    def test_returns_reviews_ordered_by_created_at_desc(self, api_client, test_cafe):
        u1 = _make_user('ruser1')
        u2 = _make_user('ruser2')
        r1 = _make_review(u1, test_cafe, comment='First')
        r2 = _make_review(u2, test_cafe, comment='Second')

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 2
        assert results[0]['id'] == r2.id
        assert results[1]['id'] == r1.id

    def test_excludes_hidden_reviews(self, api_client, test_cafe):
        u1 = _make_user('hiduser1')
        u2 = _make_user('hiduser2')
        _make_review(u1, test_cafe, comment='Visible')
        hidden = _make_review(u2, test_cafe, comment='Hidden')
        hidden.is_hidden = True
        hidden.save()

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['comment'] == 'Visible'

    def test_excludes_inactive_user_reviews(self, api_client, test_user, test_cafe):
        _make_review(test_user, test_cafe, comment='Active user')
        inactive_user = User.objects.create_user(
            username='inactive', email='inactive@example.com', password='pass',
            is_active=False,
        )
        _make_review(inactive_user, test_cafe, comment='Inactive user')

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['comment'] == 'Active user'

    def test_empty_when_no_reviews(self, api_client):
        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['results'] == []

    def test_pagination(self, api_client, test_cafe):
        for i in range(25):
            u = _make_user(f'puser{i}')
            _make_review(u, test_cafe, comment=f'Review {i}')

        response = api_client.get(f'{self.ENDPOINT}?limit=20')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 20
        assert response.data['next'] is not None

    def test_limit_capped_at_50(self, api_client, test_cafe):
        for i in range(55):
            u = _make_user(f'capuser{i}')
            _make_review(u, test_cafe, comment=f'Review {i}')

        response = api_client.get(f'{self.ENDPOINT}?limit=100')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) <= 50

    def test_response_shape(self, api_client, test_user, test_cafe):
        _make_review(test_user, test_cafe, comment='Nice wifi', visit_time=2)

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        review = response.data['results'][0]

        assert 'id' in review
        assert review['cafe']['name'] == 'Coffee Lab'
        assert review['cafe']['address_short'] == 'Jl. Senopati'
        assert review['user']['username'] == 'testuser'
        assert review['wfc_rating'] == 4
        assert review['comment'] == 'Nice wifi'
        assert review['visit_time_label'] == 'afternoon'
        assert 'created_at' in review

    def test_address_short_without_comma(self, api_client, test_user):
        cafe = Cafe.objects.create(
            name='NoComma',
            address='Single Line Address',
            latitude=Decimal('-6.2'),
            longitude=Decimal('106.8'),
            google_place_id='place_nc',
            created_by=test_user,
        )
        _make_review(test_user, cafe)

        response = api_client.get(self.ENDPOINT)
        assert response.data['results'][0]['cafe']['address_short'] == 'Single Line Address'

    def test_visit_time_label_null(self, api_client, test_user, test_cafe):
        _make_review(test_user, test_cafe, visit_time=None)

        response = api_client.get(self.ENDPOINT)
        assert response.data['results'][0]['visit_time_label'] == 'unknown'

    def test_review_without_comment(self, api_client, test_user, test_cafe):
        _make_review(test_user, test_cafe, comment='')

        response = api_client.get(self.ENDPOINT)
        assert response.data['results'][0]['comment'] == ''


@pytest.mark.django_db
class TestFeaturedLists:
    """Tests for GET /api/discover/featured-lists/"""

    ENDPOINT = '/api/discover/featured-lists/'

    def test_returns_featured_public_lists(self, api_client, test_user):
        cache.clear()
        CafeList.objects.filter(is_featured=True).delete()
        CafeList.objects.create(
            owner=test_user, name='Top Picks', description='Best cafes',
            is_public=True, is_featured=True,
        )

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        lists = response.data['lists']
        assert len(lists) == 1
        assert lists[0]['name'] == 'Top Picks'

    def test_excludes_non_featured(self, api_client, test_user):
        cache.clear()
        CafeList.objects.filter(is_featured=True).delete()
        CafeList.objects.create(
            owner=test_user, name='Not Featured', is_public=True, is_featured=False,
        )

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_featured_but_not_public(self, api_client, test_user):
        cache.clear()
        CafeList.objects.all().delete()
        lst = CafeList(
            owner=test_user, name='Secret', is_public=False, is_featured=True,
        )
        lst.save()  # clean() not called on raw save()

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_deactivated_owner(self, api_client):
        cache.clear()
        CafeList.objects.all().delete()
        owner = _make_user('delowner')
        lst = CafeList.objects.create(
            owner=owner, name='From deleted user', is_public=True, is_featured=True,
        )
        owner.is_active = False
        owner.save(update_fields=['is_active'])

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_preview_cafes_max_three(self, api_client, test_user):
        cache.clear()
        CafeList.objects.all().delete()
        lst = CafeList.objects.create(
            owner=test_user, name='Many cafes', is_public=True, is_featured=True,
        )
        cafes = []
        for i in range(5):
            cafe = Cafe.objects.create(
                name=f'Cafe {i}',
                address=f'Address {i}',
                latitude=Decimal(f'-6.{2000 + i}'),
                longitude=Decimal(f'106.{8000 + i}'),
                google_place_id=f'place_feat_{i}',
                created_by=test_user,
            )
            CafeListItem.objects.create(cafe_list=lst, cafe=cafe)
            cafes.append(cafe)

        response = api_client.get(self.ENDPOINT)
        results = response.data['lists']
        assert len(results) == 1
        preview = results[0]['preview_cafes']
        assert len(preview) == 3
        assert preview[0]['name'] == 'Cafe 0'

    def test_preview_cafes_empty_when_no_items(self, api_client, test_user):
        cache.clear()
        CafeList.objects.filter(is_featured=True).delete()
        CafeList.objects.create(
            owner=test_user, name='Empty list', is_public=True, is_featured=True,
        )

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'][0]['preview_cafes'] == []

    def test_empty_when_no_featured_lists(self, api_client):
        cache.clear()
        CafeList.objects.all().delete()
        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_limit_param(self, api_client, test_user):
        cache.clear()
        CafeList.objects.all().delete()
        for i in range(8):
            CafeList.objects.create(
                owner=test_user, name=f'Featured List {i}',
                is_public=True, is_featured=True,
            )

        response = api_client.get(f'{self.ENDPOINT}?limit=3')
        assert len(response.data['lists']) == 3

        response = api_client.get(f'{self.ENDPOINT}?limit=8')
        assert len(response.data['lists']) == 8

    def test_limit_capped_at_20(self, api_client, test_user):
        cache.clear()
        CafeList.objects.all().delete()
        for i in range(25):
            CafeList.objects.create(
                owner=test_user, name=f'FL {i}',
                is_public=True, is_featured=True,
            )

        response = api_client.get(f'{self.ENDPOINT}?limit=50')
        assert len(response.data['lists']) <= 20

    def test_description_returned_verbatim(self, api_client, test_user):
        cache.clear()
        CafeList.objects.all().delete()
        desc = 'A detailed 140-char description about remote work cafes.'
        CafeList.objects.create(
            owner=test_user, name='Desc test',
            description=desc, is_public=True, is_featured=True,
        )

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'][0]['description'] == desc


@pytest.mark.django_db
class TestTrendingCafes:
    """Tests for GET /api/discover/trending/"""

    ENDPOINT = '/api/discover/trending/'

    def setup_method(self):
        cache.clear()
        Review.objects.all().delete()
        Visit.objects.all().delete()

    def _make_visit(self, user, cafe, visit_date=None):
        return Visit.objects.create(
            user=user,
            cafe=cafe,
            visit_date=visit_date or date.today(),
        )

    def _make_review(self, user, cafe, wfc_rating=4, created_at=None):
        r = Review.objects.create(
            user=user,
            cafe=cafe,
            wifi_quality=4,
            noise_level=3,
            seating_comfort=4,
            wfc_rating=wfc_rating,
        )
        if created_at is not None:
            Review.objects.filter(pk=r.pk).update(created_at=created_at)
        return r

    def test_single_review_qualifies(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(test_user, test_cafe)

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        cafes = response.data['cafes']
        assert len(cafes) == 1
        assert cafes[0]['id'] == test_cafe.id
        assert cafes[0]['recent_review_count'] == 1
        assert cafes[0]['score'] == 3

    def test_two_visits_no_review_does_not_qualify(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_visit(test_user, test_cafe, date.today())
        self._make_visit(test_user, test_cafe, date.today() - timedelta(days=1))

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_three_visits_no_review_qualifies(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_visit(test_user, test_cafe, date.today())
        self._make_visit(test_user, test_cafe, date.today() - timedelta(days=1))
        self._make_visit(test_user, test_cafe, date.today() - timedelta(days=2))

        response = api_client.get(self.ENDPOINT)
        assert len(response.data['cafes']) == 1
        assert response.data['cafes'][0]['recent_visit_count'] == 3
        assert response.data['cafes'][0]['score'] == 3

    def test_one_review_plus_one_visit_scores_four(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(test_user, test_cafe)
        self._make_visit(test_user, test_cafe, date.today())

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'][0]['score'] == 4

    def test_visit_dedupe_same_user_same_date(self, api_client, test_user, test_cafe):
        cache.clear()
        from django.db import transaction
        Visit.objects.create(user=test_user, cafe=test_cafe, visit_date=date.today())
        with transaction.atomic():
            try:
                Visit.objects.create(user=test_user, cafe=test_cafe, visit_date=date.today())
            except Exception:
                pass  # expected: duplicate violation

        # Need 3 distinct-day visits for score>=3
        Visit.objects.create(user=test_user, cafe=test_cafe, visit_date=date.today() - timedelta(days=1))
        Visit.objects.create(user=test_user, cafe=test_cafe, visit_date=date.today() - timedelta(days=2))

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'][0]['recent_visit_count'] == 3

    def test_distinct_not_inflating_counts(self, api_client, test_user, test_cafe):
        """Cafe with both reviews and visits should not have inflated counts."""
        cache.clear()
        self._make_review(test_user, test_cafe)
        self._make_visit(test_user, test_cafe, date.today())

        response = api_client.get(self.ENDPOINT)
        cafe = response.data['cafes'][0]
        assert cafe['recent_review_count'] == 1
        assert cafe['recent_visit_count'] == 1
        assert cafe['score'] == 4

    def test_tie_break_by_rating(self, api_client, test_user):
        cache.clear()
        u1 = _make_user('tu1')
        u2 = _make_user('tu2')
        u3 = _make_user('tu3')
        u4 = _make_user('tu4')

        cafe_low = Cafe.objects.create(
            name='Low Rated', address='Addr',
            latitude=Decimal('-6.21'), longitude=Decimal('106.85'),
            google_place_id='trend_low', created_by=test_user,
            average_wfc_rating=Decimal('3.00'),
        )
        cafe_high = Cafe.objects.create(
            name='High Rated', address='Addr',
            latitude=Decimal('-6.22'), longitude=Decimal('106.86'),
            google_place_id='trend_high', created_by=test_user,
            average_wfc_rating=Decimal('4.80'),
        )

        # Both get 1 review → score=3 tied, high-rated wins
        self._make_review(u1, cafe_low)
        self._make_review(u2, cafe_high)

        response = api_client.get(self.ENDPOINT)
        cafes = response.data['cafes']
        assert len(cafes) == 2
        assert cafes[0]['name'] == 'High Rated'
        assert cafes[1]['name'] == 'Low Rated'

    def test_closed_cafes_excluded(self, api_client, test_user):
        cache.clear()
        closed = Cafe.objects.create(
            name='Closed Cafe', address='Addr',
            latitude=Decimal('-6.3'), longitude=Decimal('106.9'),
            google_place_id='trend_closed', created_by=test_user,
            is_closed=True,
        )
        self._make_review(test_user, closed)

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_hidden_reviews_not_counted(self, api_client, test_user, test_cafe):
        cache.clear()
        r = self._make_review(test_user, test_cafe)
        r.is_hidden = True
        r.save(update_fields=['is_hidden'])

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_inactive_user_reviews_not_counted(self, api_client, test_cafe):
        cache.clear()
        u = _make_user('trendinactive')
        self._make_review(u, test_cafe)
        u.is_active = False
        u.save(update_fields=['is_active'])

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_window_boundary_review_included(self, api_client, test_user, test_cafe):
        cache.clear()
        within_window = timezone.now() - timedelta(days=6)  # safely within 7d
        self._make_review(test_user, test_cafe, created_at=within_window)

        response = api_client.get(self.ENDPOINT)
        assert len(response.data['cafes']) == 1

    def test_window_boundary_review_excluded(self, api_client, test_user, test_cafe):
        cache.clear()
        just_over_7d = timezone.now() - timedelta(days=8)  # safe margin
        self._make_review(test_user, test_cafe, created_at=just_over_7d)

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_empty_when_no_qualifying_cafes(self, api_client):
        cache.clear()
        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

    def test_cache_hit(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(test_user, test_cafe)

        response1 = api_client.get(self.ENDPOINT)
        assert response1.data['cafes'][0]['id'] == test_cafe.id

        # Delete the review; cached response should still return it
        Review.objects.all().delete()
        response2 = api_client.get(self.ENDPOINT)
        assert response2.data['cafes'][0]['id'] == test_cafe.id

    def test_cafe_with_score_equal_to_threshold_qualifies(self, api_client, test_user, test_cafe):
        cache.clear()
        # 3 visits = score 3 = threshold
        self._make_visit(test_user, test_cafe, date.today())
        self._make_visit(test_user, test_cafe, date.today() - timedelta(days=1))
        self._make_visit(test_user, test_cafe, date.today() - timedelta(days=2))

        response = api_client.get(self.ENDPOINT)
        assert len(response.data['cafes']) == 1

    def test_address_short(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(test_user, test_cafe)

        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'][0]['address_short'] == 'Jl. Senopati'

    def test_days_param(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(
            test_user, test_cafe,
            created_at=timezone.now() - timedelta(days=12),
        )

        # Default 7-day window: old review excluded
        response = api_client.get(self.ENDPOINT)
        assert response.data['cafes'] == []

        # 14-day window: old review included
        response = api_client.get(f'{self.ENDPOINT}?days=14')
        assert len(response.data['cafes']) == 1

    def test_response_metadata(self, api_client, test_user, test_cafe):
        cache.clear()
        self._make_review(test_user, test_cafe)

        response = api_client.get(self.ENDPOINT)
        assert response.data['window_days'] == 7
        assert 'generated_at' in response.data


@pytest.mark.django_db
class TestTrendingLists:
    """Tests for GET /api/discover/trending-lists/ (Phase 5)."""

    ENDPOINT = '/api/discover/trending-lists/'

    def setup_method(self):
        cache.clear()
        from apps.cafes.models import CafeList, SavedCafeList
        CafeList.objects.all().delete()
        User.objects.filter(is_superuser=False, is_staff=False).delete()

    def _make_public_list(self, owner, name='My List', **kwargs):
        from apps.cafes.models import CafeList
        return CafeList.objects.create(
            owner=owner, name=name, is_public=True, **kwargs,
        )

    def _make_save(self, user, cafe_list):
        from apps.cafes.models import SavedCafeList
        return SavedCafeList.objects.create(user=user, cafe_list=cafe_list)

    def test_trending_requires_three_saves_from_distinct_users(self, api_client, test_user):
        from apps.cafes.models import CafeList
        owner = _make_user('tlo1')
        cafe_list = CafeList.objects.create(
            owner=owner, name='Trending List', is_public=True, item_count=1,
        )
        s1 = _make_user('ts1')
        s2 = _make_user('ts2')
        s3 = _make_user('ts3')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.status_code == status.HTTP_200_OK
        lists = response.data['lists']
        assert len(lists) == 1
        assert lists[0]['name'] == 'Trending List'
        assert lists[0]['recent_save_count'] == 3

    def test_two_saves_does_not_qualify(self, api_client, test_user):
        from apps.cafes.models import CafeList
        owner = _make_user('tlo2')
        cafe_list = CafeList.objects.create(
            owner=owner, name='Not enough', is_public=True, item_count=1,
        )
        s1 = _make_user('ts4')
        s2 = _make_user('ts5')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_featured_lists(self, api_client, test_user):
        owner = _make_user('tlo3')
        cafe_list = self._make_public_list(owner, name='Featured One', is_featured=True)
        s1 = _make_user('ts6')
        s2 = _make_user('ts7')
        s3 = _make_user('ts8')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_private_lists(self, api_client, test_user):
        from apps.cafes.models import CafeList
        owner = _make_user('tlo4')
        cafe_list = CafeList.objects.create(
            owner=owner, name='Private', is_public=False, item_count=1,
        )
        s1 = _make_user('ts9')
        s2 = _make_user('ts10')
        s3 = _make_user('ts11')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_special_lists(self, api_client, test_user):
        from apps.cafes.models import CafeList
        owner = _make_user('tlo5')
        cafe_list = CafeList.objects.get(owner=owner, list_type='to_go')
        cafe_list.is_public = True
        cafe_list.item_count = 1
        cafe_list.save(update_fields=['is_public', 'item_count'])
        s1 = _make_user('ts12')
        s2 = _make_user('ts13')
        s3 = _make_user('ts14')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_empty_lists(self, api_client, test_user):
        owner = _make_user('tlo6')
        cafe_list = self._make_public_list(owner, name='Empty')
        s1 = _make_user('ts15')
        s2 = _make_user('ts16')
        s3 = _make_user('ts17')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_excludes_deactivated_owners(self, api_client, test_user):
        owner = _make_user('tlo7')
        cafe_list = self._make_public_list(owner, name='Dead owner')
        s1 = _make_user('ts18')
        s2 = _make_user('ts19')
        s3 = _make_user('ts20')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)
        owner.is_active = False
        owner.save(update_fields=['is_active'])

        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

    def test_tie_break_by_lifetime_save_count(self, api_client, test_user):
        owner = _make_user('tlo8')
        from apps.cafes.models import CafeList, SavedCafeList
        list_a = CafeList.objects.create(
            owner=owner, name='A', is_public=True, item_count=1,
        )
        list_b = CafeList.objects.create(
            owner=owner, name='B', is_public=True, item_count=1,
        )

        # Both get 3 recent saves (tied), but B gets higher lifetime
        for i in range(3):
            s = _make_user(f'tba{i}')
            self._make_save(s, list_a)
        for i in range(3):
            s = _make_user(f'tbb{i}')
            self._make_save(s, list_b)

        # Give B extra lifetime save outside window
        old_user = _make_user('old_sb')
        sb = SavedCafeList.objects.create(user=old_user, cafe_list=list_b)
        SavedCafeList.objects.filter(pk=sb.pk).update(
            saved_at=timezone.now() - timedelta(days=60),
        )

        response = api_client.get(self.ENDPOINT)
        cafes = response.data['lists']
        assert len(cafes) == 2
        assert cafes[0]['name'] == 'B'
        assert cafes[1]['name'] == 'A'

    def test_limit_param(self, api_client, test_user):
        owner = _make_user('tlo9')
        from apps.cafes.models import CafeListItem
        for i in range(8):
            lst = self._make_public_list(owner, name=f'TL {i}')
            cafe = Cafe.objects.create(
                name=f'TL CafeL {i}',
                address=f'Addr {i}',
                latitude=Decimal(f'-6.{5000 + i}'),
                longitude=Decimal(f'106.{9500 + i}'),
                google_place_id=f'place_l{i}',
                created_by=test_user,
            )
            CafeListItem.objects.create(cafe_list=lst, cafe=cafe)
            lst.item_count = 1
            lst.save(update_fields=['item_count'])
            for j in range(3):
                s = _make_user(f'tls{i}_{j}')
                self._make_save(s, lst)

        response = api_client.get(f'{self.ENDPOINT}?limit=3')
        assert len(response.data['lists']) == 3

        response = api_client.get(f'{self.ENDPOINT}?limit=6')
        assert len(response.data['lists']) == 6

    def test_days_param(self, api_client, test_user):
        owner = _make_user('tlo10')
        cafe_list = self._make_public_list(owner, name='Recent Only')
        cafe_list.item_count = 1
        cafe_list.save(update_fields=['item_count'])
        # Create 3 saves, but 2 of them are old
        s1 = _make_user('tds1')
        s2 = _make_user('tds2')
        s3 = _make_user('tds3')
        self._make_save(s1, cafe_list)
        sb2 = self._make_save(s2, cafe_list)
        sb3 = self._make_save(s3, cafe_list)
        from apps.cafes.models import SavedCafeList
        SavedCafeList.objects.filter(pk=sb2.pk).update(
            saved_at=timezone.now() - timedelta(days=40),
        )
        SavedCafeList.objects.filter(pk=sb3.pk).update(
            saved_at=timezone.now() - timedelta(days=40),
        )

        # Default 30-day window: only 1 recent save → below threshold
        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []

        # 90-day window: all 3 qualify
        response = api_client.get(f'{self.ENDPOINT}?days=90')
        assert len(response.data['lists']) == 1

    def test_preview_cafes_in_response(self, api_client, test_user):
        owner = _make_user('tlo11')
        cafe_list = self._make_public_list(owner, name='Preview Test')
        from apps.cafes.models import CafeListItem
        cafes = []
        for i in range(4):
            cafe = Cafe.objects.create(
                name=f'TL Cafe {i}',
                address=f'Addr {i}',
                latitude=Decimal(f'-6.{4000 + i}'),
                longitude=Decimal(f'106.{9000 + i}'),
                google_place_id=f'place_tl_{i}',
                created_by=test_user,
            )
            CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe)
            cafes.append(cafe)
        cafe_list.item_count = 4
        cafe_list.save(update_fields=['item_count'])

        s1 = _make_user('tls4')
        s2 = _make_user('tls5')
        s3 = _make_user('tls6')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response = api_client.get(self.ENDPOINT)
        lists = response.data['lists']
        assert len(lists) == 1
        preview = lists[0]['preview_cafes']
        assert len(preview) == 3
        assert preview[0]['name'] == 'TL Cafe 0'

    def test_save_count_in_response(self, api_client, test_user):
        owner = _make_user('tlo12')
        cafe_list = self._make_public_list(owner, name='Count Test')
        cafe_list.item_count = 1
        cafe_list.save(update_fields=['item_count'])
        for i in range(5):
            s = _make_user(f'tlc{i}')
            self._make_save(s, cafe_list)

        response = api_client.get(self.ENDPOINT)
        lists = response.data['lists']
        assert len(lists) == 1
        assert lists[0]['save_count'] == 5
        assert lists[0]['recent_save_count'] == 5

    def test_cache_hit(self, api_client, test_user):
        cache.clear()
        owner = _make_user('tlo13')
        cafe_list = self._make_public_list(owner, name='Cached List')
        cafe_list.item_count = 1
        cafe_list.save(update_fields=['item_count'])
        s1 = _make_user('tch1')
        s2 = _make_user('tch2')
        s3 = _make_user('tch3')
        self._make_save(s1, cafe_list)
        self._make_save(s2, cafe_list)
        self._make_save(s3, cafe_list)

        response1 = api_client.get(self.ENDPOINT)
        assert len(response1.data['lists']) == 1

        # Delete all saves; cached response should still return it
        from apps.cafes.models import SavedCafeList
        SavedCafeList.objects.all().delete()
        response2 = api_client.get(self.ENDPOINT)
        assert len(response2.data['lists']) == 1

    def test_empty_when_no_qualifying_lists(self, api_client):
        cache.clear()
        response = api_client.get(self.ENDPOINT)
        assert response.data['lists'] == []
