from django.db import migrations
import django.contrib.postgres.indexes
from django.contrib.postgres.operations import TrigramExtension


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0024_cafe_place_category'),
    ]

    operations = [
        TrigramExtension(),
        migrations.AddIndex(
            model_name='cafe',
            index=django.contrib.postgres.indexes.GinIndex(
                fields=['name'],
                name='cafe_name_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ),
        migrations.AddIndex(
            model_name='cafe',
            index=django.contrib.postgres.indexes.GinIndex(
                fields=['address'],
                name='cafe_address_trgm_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ),
    ]
