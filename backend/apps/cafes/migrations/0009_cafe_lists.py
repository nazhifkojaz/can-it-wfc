import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cafes", "0008_add_favorite_composite_index"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CafeList",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("description", models.TextField(blank=True, max_length=300)),
                ("is_default", models.BooleanField(default=False, help_text="The auto-created 'Favorites' list. One per user.")),
                ("is_public", models.BooleanField(default=False, help_text="Reserved for future sharing UI.")),
                ("item_count", models.IntegerField(default=0, help_text="Denormalized count; updated via signal on item add/remove.")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="cafe_lists",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "cafe_lists",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="CafeListItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("note", models.TextField(blank=True, max_length=200)),
                ("added_at", models.DateTimeField(auto_now_add=True)),
                (
                    "cafe",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="list_entries",
                        to="cafes.cafe",
                    ),
                ),
                (
                    "cafe_list",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="cafes.cafelist",
                    ),
                ),
            ],
            options={
                "db_table": "cafe_list_items",
                "ordering": ["-added_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="cafelist",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_default=True),
                fields=["owner"],
                name="unique_default_list_per_user",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="cafelist",
            unique_together={("owner", "name")},
        ),
        migrations.AlterUniqueTogether(
            name="cafelistitem",
            unique_together={("cafe_list", "cafe")},
        ),
        migrations.AddIndex(
            model_name="cafelist",
            index=models.Index(fields=["owner", "-updated_at"], name="cafelist_owner_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="cafelist",
            index=models.Index(fields=["owner", "is_default"], name="cafelist_owner_default_idx"),
        ),
        migrations.AddIndex(
            model_name="cafelistitem",
            index=models.Index(fields=["cafe_list", "-added_at"], name="cafelistitem_list_added_idx"),
        ),
        migrations.AddIndex(
            model_name="cafelistitem",
            index=models.Index(fields=["cafe", "cafe_list"], name="cafelistitem_cafe_list_idx"),
        ),
    ]
