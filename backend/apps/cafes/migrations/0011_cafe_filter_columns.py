from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0010_drop_favorites'),
    ]

    operations = [
        migrations.AddField(
            model_name='cafe',
            name='avg_wifi_rating',
            field=models.DecimalField(blank=True, db_index=True, decimal_places=2, max_digits=3, null=True),
        ),
        migrations.AddField(
            model_name='cafe',
            name='avg_power_rating',
            field=models.DecimalField(blank=True, db_index=True, decimal_places=2, max_digits=3, null=True),
        ),
        migrations.AddField(
            model_name='cafe',
            name='avg_noise_level',
            field=models.DecimalField(blank=True, db_index=True, decimal_places=2, max_digits=3, null=True),
        ),
        migrations.AddField(
            model_name='cafe',
            name='avg_seating_comfort',
            field=models.DecimalField(blank=True, db_index=True, decimal_places=2, max_digits=3, null=True),
        ),
        migrations.AddIndex(
            model_name='cafe',
            index=models.Index(fields=['avg_wifi_rating', 'avg_noise_level'], name='cafe_wifi_noise_idx'),
        ),
    ]
