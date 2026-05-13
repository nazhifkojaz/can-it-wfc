# Generated manually — backfills visibility from is_public, then removes is_public.

from django.db import migrations, models


def backfill_visibility(apps, schema_editor):
    CafeList = apps.get_model('cafes', 'CafeList')
    CafeList.objects.filter(is_public=True).update(visibility='public')


def reverse_backfill(apps, schema_editor):
    CafeList = apps.get_model('cafes', 'CafeList')
    CafeList.objects.filter(visibility='public').update(is_public=True)
    CafeList.objects.filter(visibility__in=('private', 'shareable')).update(is_public=False)


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0022_add_visibility_share_token'),
    ]

    operations = [
        migrations.RunPython(backfill_visibility, reverse_backfill),
        migrations.RemoveField(
            model_name='cafelist',
            name='is_public',
        ),
    ]
