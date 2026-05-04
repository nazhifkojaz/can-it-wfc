from django.db import migrations


def populate_filter_columns(apps, schema_editor):
    Cafe = apps.get_model('cafes', 'Cafe')
    batch_size = 500
    offset = 0
    while True:
        batch = list(Cafe.objects.all()[offset:offset + batch_size])
        if not batch:
            break
        for cafe in batch:
            cache = cafe.average_ratings_cache
            if cache:
                cafe.avg_wifi_rating = cache.get('wifi_quality')
                cafe.avg_power_rating = cache.get('power_outlets_rating')
                cafe.avg_noise_level = cache.get('noise_level')
                cafe.avg_seating_comfort = cache.get('seating_comfort')
        Cafe.objects.bulk_update(
            batch,
            ['avg_wifi_rating', 'avg_power_rating', 'avg_noise_level', 'avg_seating_comfort'],
        )
        offset += batch_size


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0011_cafe_filter_columns'),
    ]

    operations = [
        migrations.RunPython(populate_filter_columns, migrations.RunPython.noop),
    ]
