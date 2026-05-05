# Manually written migration: create PriceCluster model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0015_cafe_h3_cell_r7'),
    ]

    operations = [
        migrations.CreateModel(
            name='PriceCluster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('h3_cell', models.CharField(db_index=True, max_length=15)),
                ('currency', models.CharField(max_length=3)),
                ('median_of_medians', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('cafe_medians', models.JSONField(help_text='Sorted list of cafe-level spend medians in this cluster')),
                ('cafe_count', models.IntegerField()),
                ('computed_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'cafes_price_clusters',
                'verbose_name': 'Price Cluster',
                'verbose_name_plural': 'Price Clusters',
                'unique_together': {('h3_cell', 'currency')},
            },
        ),
    ]
