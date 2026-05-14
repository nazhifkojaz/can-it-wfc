# Generated manually — Discover panel: recency index for global review feed

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0012_alter_review_visit_time'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='review',
            index=models.Index(
                fields=['-created_at', 'is_hidden'],
                name='review_recency_idx',
            ),
        ),
    ]
