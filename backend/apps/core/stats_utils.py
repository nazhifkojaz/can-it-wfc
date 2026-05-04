from django.db import transaction
from django.db.models import Count


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
