import bisect
import statistics
from collections import Counter

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.core.constants import (
    INSIGHTS_CACHE_VERSION,
    INSIGHTS_SAMPLE_THRESHOLDS,
    INSIGHTS_STICKINESS_THRESHOLDS,
)


@transaction.atomic
def update_user_stats(user):
    from apps.reviews.models import Review, Visit

    user.total_reviews = Review.objects.filter(user=user).count()
    user.total_visits = Visit.objects.filter(user=user).count()
    user.save(update_fields=['total_reviews', 'total_visits'])


@transaction.atomic
def update_cafe_stats(cafe):
    from apps.reviews.models import Review, Visit

    visit_stats = Visit.objects.filter(cafe=cafe).aggregate(
        total_visits=Count('id'),
        unique_visitors=Count('user', distinct=True)
    )
    cafe.total_visits = visit_stats['total_visits'] or 0
    cafe.unique_visitors = visit_stats['unique_visitors'] or 0

    recent_reviews = Review.objects.filter(
        cafe=cafe,
        is_hidden=False
    ).order_by('-created_at')[:100]

    recent_reviews_list = list(recent_reviews)
    total_recent = len(recent_reviews_list)

    cafe.total_reviews = Review.objects.filter(cafe=cafe, is_hidden=False).count()

    if recent_reviews_list:
        avg_rating = sum(r.wfc_rating for r in recent_reviews_list) / total_recent
        cafe.average_wfc_rating = round(avg_rating, 2)

        wifi_avg = round(sum(r.wifi_quality for r in recent_reviews_list) / total_recent, 2)
        noise_avg = round(sum(r.noise_level for r in recent_reviews_list) / total_recent, 2)
        seating_avg = round(sum(r.seating_comfort for r in recent_reviews_list) / total_recent, 2)
        power_ratings = [r.power_outlets_rating for r in recent_reviews_list if r.power_outlets_rating is not None]
        power_avg = round(sum(power_ratings) / len(power_ratings), 2) if power_ratings else None

        cafe.avg_wifi_rating = wifi_avg
        cafe.avg_noise_level = noise_avg
        cafe.avg_seating_comfort = seating_avg
        cafe.avg_power_rating = power_avg

        cafe.average_ratings_cache = {
            'wifi_quality': round(wifi_avg, 1),
            'power_outlets_rating': round(power_avg, 1) if power_avg is not None else None,
            'seating_comfort': round(seating_avg, 1),
            'noise_level': round(noise_avg, 1),
            'wfc_rating': round(avg_rating, 1),
        }

        # Facility mentions: count reviewers who checked each option
        # (pick-what-applies model — True = mentioned, null = not observed)
        def count_mentions(field_name):
            return sum(1 for r in recent_reviews_list if getattr(r, field_name) is True)

        cafe.facility_stats_cache = {
            'smoking_area': {
                'mentions': count_mentions('has_smoking_area'),
                'total_reviewers': total_recent,
            },
            'prayer_room': {
                'mentions': count_mentions('has_prayer_room'),
                'total_reviewers': total_recent,
            },
            'indoor_seating': {
                'mentions': count_mentions('has_indoor_seating'),
                'total_reviewers': total_recent,
            },
            'outdoor_seating': {
                'mentions': count_mentions('has_outdoor_seating'),
                'total_reviewers': total_recent,
            },
        }
    else:
        cafe.average_wfc_rating = None
        cafe.avg_wifi_rating = None
        cafe.avg_power_rating = None
        cafe.avg_noise_level = None
        cafe.avg_seating_comfort = None
        cafe.average_ratings_cache = None
        cafe.facility_stats_cache = None

    cafe.save(update_fields=[
        'total_visits',
        'unique_visitors',
        'total_reviews',
        'average_wfc_rating',
        'avg_wifi_rating',
        'avg_power_rating',
        'avg_noise_level',
        'avg_seating_comfort',
        'average_ratings_cache',
        'facility_stats_cache',
    ])

    recompute_cafe_insights(cafe)


def _compute_ratings(recent_reviews):
    if not recent_reviews:
        return None

    total = len(recent_reviews)
    wifi_avg = round(sum(r.wifi_quality for r in recent_reviews) / total, 1)
    noise_avg = round(sum(r.noise_level for r in recent_reviews) / total, 1)
    seating_avg = round(sum(r.seating_comfort for r in recent_reviews) / total, 1)
    power_ratings = [r.power_outlets_rating for r in recent_reviews if r.power_outlets_rating is not None]
    power_avg = round(sum(power_ratings) / len(power_ratings), 1) if power_ratings else None

    return {
        'wifi': {'avg': wifi_avg, 'n': total},
        'power': {'avg': power_avg, 'n': len(power_ratings)} if power_avg is not None else {'avg': None, 'n': 0},
        'noise': {'avg': noise_avg, 'n': total},
        'seating': {'avg': seating_avg, 'n': total},
    }


def _compute_rating_distribution(recent_reviews):
    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    n = len(recent_reviews)
    if n < thresholds['RATING_DISTRIBUTION_MIN_REVIEWS']:
        return None

    ratings = [r.wfc_rating for r in recent_reviews]
    mean = sum(ratings) / n
    stddev = statistics.pstdev(ratings)

    if stddev < 0.5 and mean >= 4.5:
        return None

    counts = Counter(ratings)
    distribution = {str(k): counts.get(k, 0) for k in range(1, 6)}

    low_count = counts.get(1, 0) + counts.get(2, 0)
    high_count = counts.get(4, 0) + counts.get(5, 0)
    low_share = low_count / n
    high_share = high_count / n
    polarized = (
        low_share >= 0.25 and high_share >= 0.25
        and low_count >= 3 and high_count >= 3
    )

    if stddev < 0.6:
        consistency = 'consistent'
    elif stddev <= 1.1:
        consistency = 'mixed'
    else:
        consistency = 'polarizing'

    return {
        'distribution': distribution,
        'n': n,
        'polarized': polarized,
        'consistency': consistency,
        'top_share': round(high_share, 2),
    }


def _compute_spend(cafe):
    from apps.reviews.models import Visit

    visits = Visit.objects.filter(
        cafe=cafe,
        amount_spent__isnull=False,
    ).values_list('amount_spent', 'currency')

    if not visits:
        return None

    currency_counts = Counter(c for _, c in visits)
    primary_currency = currency_counts.most_common(1)[0][0]

    by_currency = {}
    for amount, currency in visits:
        by_currency.setdefault(currency, []).append(float(amount))

    primary_amounts = sorted(by_currency.get(primary_currency, []))
    if not primary_amounts:
        return None

    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    if len(primary_amounts) < thresholds['COST_VISITS']:
        return None

    primary_median = _median(primary_amounts)
    primary_n = len(primary_amounts)

    secondary = []
    for currency, amounts in by_currency.items():
        if currency == primary_currency:
            continue
        if len(amounts) >= thresholds['COST_VISITS']:
            secondary.append({
                'currency': currency,
                'median': _median(sorted(amounts)),
                'n': len(amounts),
            })

    result = {
        'primary': {
            'currency': primary_currency,
            'median': primary_median,
            'n': primary_n,
        },
    }
    if secondary:
        result['secondary'] = secondary

    percentile = _compute_price_percentile(cafe, result)
    if percentile:
        result['percentile'] = percentile

    return result


def _median(sorted_values):
    n = len(sorted_values)
    if n == 0:
        return 0
    if n % 2 == 1:
        return sorted_values[n // 2]
    return round((sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2, 2)


def _compute_price_percentile(cafe, spend):
    from apps.cafes.models import PriceCluster

    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    if not spend or not cafe.h3_cell_r7:
        return None

    primary = spend.get('primary')
    if not primary:
        return None

    cluster = PriceCluster.objects.filter(
        h3_cell=cafe.h3_cell_r7,
        currency=primary['currency'],
    ).first()
    if not cluster or cluster.cafe_count < thresholds['PRICE_CLUSTER_MIN_CAFES']:
        return None

    medians = cluster.cafe_medians
    own = float(primary['median'])
    rank = bisect.bisect_left(medians, own)
    percentile = round(100 * rank / len(medians))

    if percentile <= 25:
        label = 'cheaper_than_most'
    elif percentile >= 75:
        label = 'pricier_than_most'
    else:
        # Suppress mid_range if the cluster is too homogeneous
        if len(medians) >= 2:
            stddev = statistics.pstdev(medians)
            cluster_median = float(cluster.median_of_medians or 0)
            if cluster_median > 0 and stddev / cluster_median < 0.15:
                return None
        label = 'mid_range'

    return {
        'rank': percentile,
        'cluster_size': cluster.cafe_count,
        'currency': primary['currency'],
        'label': label,
    }


def _compute_time_of_day(cafe, recent_reviews):
    from apps.reviews.models import Visit

    thresholds = INSIGHTS_SAMPLE_THRESHOLDS

    visit_times = list(
        Visit.objects.filter(cafe=cafe, visit_time__isnull=False)
        .values_list('visit_time', flat=True)
    )
    review_times = [r.visit_time for r in recent_reviews if r.visit_time is not None]

    all_times = visit_times + review_times
    total = len(all_times)

    if total < thresholds['TIME_OF_DAY_RECORDS']:
        return None

    buckets = Counter(all_times)
    distribution = {}
    for key in [1, 2, 3]:
        distribution[_time_key(key)] = round(buckets.get(key, 0) / total, 2)

    wfc_by_bucket = {}
    review_time_map = Counter()
    review_time_rating = {}
    for r in recent_reviews:
        if r.visit_time is not None:
            review_time_map[r.visit_time] += 1
            review_time_rating.setdefault(r.visit_time, []).append(r.wfc_rating)

    for time_key, count in review_time_map.items():
        if count >= thresholds['RATING_BY_TIME_PER_BUCKET']:
            ratings = review_time_rating[time_key]
            wfc_by_bucket[_time_key(time_key)] = round(sum(ratings) / len(ratings), 1)

    if len(wfc_by_bucket) < thresholds['RATING_BY_TIME_MIN_BUCKETS']:
        wfc_by_bucket = {}

    result = {
        'distribution': distribution,
        'n': total,
    }
    if wfc_by_bucket:
        result['wfc_by_bucket'] = wfc_by_bucket

    return result


def _time_key(value):
    return {1: 'morning', 2: 'afternoon', 3: 'evening'}.get(value, 'unknown')


_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


def _compute_day_of_week(cafe):
    from apps.reviews.models import Visit

    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    visit_dates = list(
        Visit.objects.filter(cafe=cafe).values_list('visit_date', flat=True)
    )
    n = len(visit_dates)
    if n < thresholds['DAY_OF_WEEK_MIN_VISITS']:
        return None

    weekend_count = sum(1 for d in visit_dates if d.weekday() >= 5)
    weekday_count = n - weekend_count
    weekday_share = round(weekday_count / n, 2)
    weekend_share = round(weekend_count / n, 2)

    if weekday_share >= 0.7:
        label = 'weekday_heavy'
    elif weekend_share >= 0.6:
        label = 'weekend_heavy'
    else:
        label = 'balanced'

    by_day = None
    if n >= thresholds['DAY_OF_WEEK_DETAILED_MIN_VISITS']:
        counts = Counter(d.weekday() for d in visit_dates)
        active_days = sum(1 for i in range(7) if counts.get(i, 0) > 0)
        if active_days >= thresholds['DAY_OF_WEEK_DETAILED_MIN_ACTIVE_DAYS']:
            by_day = {
                _DAY_KEYS[i]: round(counts.get(i, 0) / n, 2)
                for i in range(7)
            }

    result = {
        'weekday_share': weekday_share,
        'weekend_share': weekend_share,
        'n': n,
        'label': label,
    }
    if by_day:
        result['by_day'] = by_day
    return result


def _compute_recent_activity(cafe):
    from apps.reviews.models import Visit
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=30)
    count = Visit.objects.filter(cafe=cafe, created_at__gte=cutoff).count()

    return {
        'visits_last_30d': count,
        'as_of': timezone.now().date().isoformat(),
    }


def _compute_stickiness(cafe):
    from apps.reviews.models import Visit
    from datetime import timedelta
    from django.db.models import Count, Max, Min

    s = INSIGHTS_STICKINESS_THRESHOLDS
    today = timezone.now().date()
    recency_cutoff = today - timedelta(days=s['ACTIVE_REGULARS_RECENCY_DAYS'])
    newcomer_cutoff = today - timedelta(days=s['NEWCOMER_RECENT_DAYS'])
    cadence_cutoff = today - timedelta(days=s['CADENCE_RECENT_DAYS'])

    base = Visit.objects.filter(cafe=cafe)
    if cafe.created_by_id:
        base = base.exclude(user_id=cafe.created_by_id)

    per_user = list(
        base.values('user_id').annotate(
            visit_count=Count('id'),
            last_visit=Max('visit_date'),
            first_visit=Min('visit_date'),
        )
    )
    unique_visitors = len(per_user)
    total_visits = sum(u['visit_count'] for u in per_user)

    if (
        unique_visitors < s['MIN_UNIQUE_VISITORS']
        or total_visits < s['MIN_TOTAL_VISITS']
    ):
        return None

    ratio = round(total_visits / unique_visitors, 1)

    active_regulars = sum(
        1 for u in per_user
        if u['visit_count'] >= s['ACTIVE_REGULARS_MIN_VISITS']
        and u['last_visit'] >= recency_cutoff
    )

    recent_visits = list(
        base.filter(visit_date__gte=newcomer_cutoff)
        .values_list('user_id', 'visit_date')
    )
    if recent_visits:
        user_first = {u['user_id']: u['first_visit'] for u in per_user}
        newcomer_count = sum(
            1 for uid, _ in recent_visits
            if user_first.get(uid) and user_first[uid] >= newcomer_cutoff
        )
        recent_newcomer_share = newcomer_count / len(recent_visits)
    else:
        recent_newcomer_share = 0.0

    if (
        active_regulars >= s['BELOVED_MIN_REGULARS']
        and ratio >= s['BELOVED_MIN_RATIO']
    ):
        label = 'beloved'
    elif (
        active_regulars >= s['HAS_REGULARS_MIN_REGULARS']
        and ratio >= s['HAS_REGULARS_MIN_RATIO']
    ):
        label = 'has_regulars'
    elif (
        recent_newcomer_share >= s['DISCOVERY_NEWCOMER_SHARE']
        and total_visits >= s['DISCOVERY_MIN_TOTAL_VISITS']
    ):
        label = 'discovery_phase'
    elif ratio >= s['STEADY_MIX_MIN_RATIO']:
        label = 'steady_mix'
    else:
        return None

    cadence_days = _compute_cadence_days(base, cadence_cutoff, s)

    result = {
        'ratio': ratio,
        'label': label,
        'active_regulars': active_regulars,
        'unique_visitors': unique_visitors,
    }
    if cadence_days is not None:
        result['cadence_days'] = cadence_days

    return result


def _compute_cadence_days(base_qs, cadence_cutoff, thresholds):
    rows = (
        base_qs.filter(visit_date__gte=cadence_cutoff)
        .order_by('user_id', 'visit_date')
        .values('user_id', 'visit_date')
    )

    visits_by_user = {}
    for v in rows:
        visits_by_user.setdefault(v['user_id'], []).append(v['visit_date'])

    intervals = []
    for dates in visits_by_user.values():
        for i in range(1, len(dates)):
            delta = (dates[i] - dates[i - 1]).days
            if delta > 0:
                intervals.append(delta)

    if len(intervals) < thresholds['CADENCE_MIN_INTERVALS']:
        return None

    intervals.sort()
    return intervals[len(intervals) // 2]


def _compute_google_delta(cafe):
    thresholds = INSIGHTS_SAMPLE_THRESHOLDS

    if not cafe.average_wfc_rating or not cafe.google_rating:
        return None

    wfc = float(cafe.average_wfc_rating)
    google = float(cafe.google_rating)
    delta = round(wfc - google, 1)

    if abs(delta) < thresholds['GOOGLE_DELTA_MIN']:
        return None

    return {'wfc': round(wfc, 1), 'google': round(google, 1), 'delta': delta}


def compute_cafe_insights(cafe):
    from apps.reviews.models import Review

    recent_reviews = list(
        Review.objects.filter(cafe=cafe, is_hidden=False)
        .order_by('-created_at')[:100]
    )

    ratings = _compute_ratings(recent_reviews)
    rating_distribution = _compute_rating_distribution(recent_reviews)
    spend = _compute_spend(cafe)
    time_of_day = _compute_time_of_day(cafe, recent_reviews)
    day_of_week = _compute_day_of_week(cafe)
    recent_activity = _compute_recent_activity(cafe)
    stickiness = _compute_stickiness(cafe)
    google_delta = _compute_google_delta(cafe)

    insights = {
        'version': INSIGHTS_CACHE_VERSION,
    }

    if ratings:
        insights['ratings'] = ratings
    if rating_distribution:
        insights['rating_distribution'] = rating_distribution
    if spend:
        insights['spend'] = spend
    if time_of_day:
        insights['time_of_day'] = time_of_day
    if day_of_week:
        insights['day_of_week'] = day_of_week
    if recent_activity:
        insights['recent_activity'] = recent_activity
    if stickiness:
        insights['stickiness'] = stickiness
    if google_delta:
        insights['google_delta'] = google_delta

    return insights


def refresh_cafe_insights(cafe):
    from apps.core.constants import INSIGHTS_CACHE_VERSION

    cache = cafe.insights_cache
    if cache and cache.get('version') == INSIGHTS_CACHE_VERSION:
        recent_activity = _compute_recent_activity(cafe)
        cache['recent_activity'] = recent_activity
        cafe.insights_cache = cache
        cafe.insights_cache_computed_at = timezone.now()
        cafe.save(update_fields=['insights_cache', 'insights_cache_computed_at'])
    else:
        recompute_cafe_insights(cafe)


def recompute_cafe_insights(cafe):
    insights = compute_cafe_insights(cafe)
    cafe.insights_cache = insights
    cafe.insights_cache_version = INSIGHTS_CACHE_VERSION
    cafe.insights_cache_computed_at = timezone.now()
    cafe.save(update_fields=[
        'insights_cache',
        'insights_cache_version',
        'insights_cache_computed_at',
    ])
