from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0023_backfill_visibility_remove_is_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='cafe',
            name='place_category',
            field=models.CharField(
                choices=[
                    ('cafe', 'Cafe'),
                    ('coworking_space', 'Coworking space'),
                    ('library', 'Library'),
                ],
                db_index=True,
                default='cafe',
                help_text='WFC place category used for discovery and map labeling',
                max_length=32,
            ),
        ),
    ]
