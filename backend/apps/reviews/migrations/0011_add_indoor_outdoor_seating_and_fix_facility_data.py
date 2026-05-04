from django.db import migrations, models


def fix_false_facility_data(apps, schema_editor):
    """Convert existing False values to NULL for facility fields.

    The UX has changed from tri-state (yes/no/don't know) to pick-what-applies
    (checked = True, unchecked = null). Old 'No' answers are no longer meaningful
    in the new model and are migrated to 'not observed'.
    """
    Review = apps.get_model('reviews', 'Review')
    Review.objects.filter(has_smoking_area=False).update(has_smoking_area=None)
    Review.objects.filter(has_prayer_room=False).update(has_prayer_room=None)


def undo_fix_false_facility_data(apps, schema_editor):
    """No-op reverse — we can't distinguish migrated NULLs from original NULLs."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0010_alter_review_visit_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='has_indoor_seating',
            field=models.BooleanField(blank=True, null=True, help_text='Does the cafe have indoor seating? (null=not observed)'),
        ),
        migrations.AddField(
            model_name='review',
            name='has_outdoor_seating',
            field=models.BooleanField(blank=True, null=True, help_text='Does the cafe have outdoor seating? (null=not observed)'),
        ),
        migrations.RunPython(
            fix_false_facility_data,
            undo_fix_false_facility_data,
        ),
    ]
