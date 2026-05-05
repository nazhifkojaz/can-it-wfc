from collections import Counter

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from apps.core.constants import (
    INSIGHTS_BEST_FOR_RULES,
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


def _compute_best_for(ratings, price_range):
    """
    TODO: Replace fixed-threshold heuristic with NLP analysis of review text.
    Current approach uses hardcoded rating thresholds (e.g., WiFi >= 4.0).
    Future: Analyze review text for keywords/sentiment related to categories
    (video calls, long sessions, focus work, quick stops) using spaCy/LLM.
    See discussion: remove static chips until NLP pipeline is built.
    """
    if not ratings:
        return []

    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    if ratings['wifi']['n'] < thresholds['BEST_FOR_REVIEWS']:
        return []

    rules = INSIGHTS_BEST_FOR_RULES
    results = []

    wifi_avg = ratings['wifi']['avg'] or 0
    noise_avg = ratings['noise']['avg'] or 0
    power_avg = ratings['power']['avg'] or 0
    seating_avg = ratings['seating']['avg'] or 0

    r = rules['video_calls']
    if wifi_avg >= r['min_wifi'] and noise_avg <= r['max_noise']:
        results.append('video_calls')

    r = rules['long_sessions']
    if power_avg >= r['min_power'] and seating_avg >= r['min_seating']:
        results.append('long_sessions')

    r = rules['focus_work']
    if noise_avg <= r['max_noise'] and seating_avg >= r['min_seating']:
        results.append('focus_work')

    r = rules['quick_stops']
    if price_range and price_range <= r['max_price'] and wifi_avg >= r['min_wifi']:
        results.append('quick_stops')

    return results


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

    return result


def _median(sorted_values):
    n = len(sorted_values)
    if n == 0:
        return 0
    if n % 2 == 1:
        return sorted_values[n // 2]
    return round((sorted_values[n // 2 - 1] + sorted_values[n // 2]) / 2, 2)


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
    thresholds = INSIGHTS_SAMPLE_THRESHOLDS
    stickiness = INSIGHTS_STICKINESS_THRESHOLDS

    if cafe.unique_visitors < thresholds['STICKINESS_UNIQUE_VISITORS']:
        return None

    ratio = round(cafe.total_visits / cafe.unique_visitors, 1)

    if ratio >= stickiness['MANY_REGULARS']:
        label = 'many_regulars'
    elif ratio >= stickiness['MIX_MIN']:
        label = 'mix'
    else:
        label = 'mostly_first_timers'

    return {'ratio': ratio, 'label': label}


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
    best_for = _compute_best_for(ratings, cafe.price_range) if ratings else []
    spend = _compute_spend(cafe)
    time_of_day = _compute_time_of_day(cafe, recent_reviews)
    recent_activity = _compute_recent_activity(cafe)
    stickiness = _compute_stickiness(cafe)
    google_delta = _compute_google_delta(cafe)

    insights = {
        'version': INSIGHTS_CACHE_VERSION,
    }

    if ratings:
        insights['ratings'] = ratings
    if best_for:
        insights['best_for'] = best_for
    if spend:
        insights['spend'] = spend
    if time_of_day:
        insights['time_of_day'] = time_of_day
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
