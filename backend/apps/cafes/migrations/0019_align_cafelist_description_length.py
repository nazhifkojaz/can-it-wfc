# Generated manually — Discover panel: align description length with Review.comment (160)

from django.db import migrations, models


def truncate_descriptions(apps, schema_editor):
    """Truncate existing CafeList descriptions to 160 chars."""
    CafeList = apps.get_model('cafes', 'CafeList')
    truncated = 0
    for lst in CafeList.objects.all().iterator():
        desc = lst.description or ''
        if len(desc) > 160:
            lst.description = desc[:160]
            lst.save(update_fields=['description'])
            truncated += 1
    if truncated > 0:
        print(f'  Truncated description for {truncated} CafeList(s) to 160 chars.')


def reverse_truncation(apps, schema_editor):
    pass  # Data loss is irreversible; acceptable for pre-launch phase


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0018_cafelist_featured'),
    ]

    operations = [
        migrations.RunPython(truncate_descriptions, reverse_code=reverse_truncation),
        migrations.AlterField(
            model_name='cafelist',
            name='description',
            field=models.TextField(blank=True, max_length=160),
        ),
    ]
