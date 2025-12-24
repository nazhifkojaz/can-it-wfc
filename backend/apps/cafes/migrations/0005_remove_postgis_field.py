# Migration to remove PostGIS PointField and spatial index
# Part of optimization to use PlacesAPI-first architecture with indexed lookups

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("cafes", "0004_add_cache_fields"),
    ]

    operations = [
        # Use raw SQL to remove the PostGIS field and index
        # This avoids Django trying to interpret the PostGIS field type
        # when we've already switched to regular PostgreSQL backend
        migrations.RunSQL(
            # Forward: Drop index and column
            sql="""
                DROP INDEX IF EXISTS cafes_location_gist_idx;
                ALTER TABLE cafes DROP COLUMN IF EXISTS location;
            """,
            # Reverse: Cannot reverse - would require PostGIS
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
