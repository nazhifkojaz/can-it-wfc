# Migration to remove PostGIS PointField and spatial index
# Part of optimization to use PlacesAPI-first architecture with indexed lookups

from django.db import migrations


def remove_postgis_location(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return

    schema_editor.execute('DROP INDEX IF EXISTS cafes_location_gist_idx;')
    schema_editor.execute('ALTER TABLE cafes DROP COLUMN IF EXISTS location;')


class Migration(migrations.Migration):

    dependencies = [
        ("cafes", "0004_add_cache_fields"),
    ]

    operations = [
        migrations.RunPython(
            remove_postgis_location,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
