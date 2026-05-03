from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("cafes", "0009_cafe_lists"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='favorite',
            name='favorite_lookup_idx',
        ),
        migrations.DeleteModel(
            name='Favorite',
        ),
    ]
