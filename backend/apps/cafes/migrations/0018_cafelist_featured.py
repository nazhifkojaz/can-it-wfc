# Generated manually — Discover panel: editorial curation lever

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('cafes', '0017_add_list_type_and_icon'),
    ]

    operations = [
        migrations.AddField(
            model_name='cafelist',
            name='is_featured',
            field=models.BooleanField(
                default=False,
                db_index=True,
                help_text='Featured lists appear on the Discover panel.',
            ),
        ),
        migrations.AddField(
            model_name='cafelist',
            name='featured_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='Timestamp when the list was featured. Auto-set when is_featured flips true.',
            ),
        ),
    ]
