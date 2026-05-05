# Manually written migration: add h3_cell_r7 to Cafe

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0014_cafe_insights_cache'),
    ]

    operations = [
        migrations.AddField(
            model_name='cafe',
            name='h3_cell_r7',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='H3 cell index at resolution 7 (~5 km) for local cluster aggregates',
                max_length=15,
                null=True,
            ),
        ),
    ]
