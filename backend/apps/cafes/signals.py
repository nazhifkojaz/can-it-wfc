from django.db.models import F
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import CafeListItem


@receiver(post_save, sender=CafeListItem)
def increment_list_item_count(sender, instance, created, **kwargs):
    if created:
        instance.cafe_list.__class__.objects.filter(pk=instance.cafe_list_id).update(
            item_count=F('item_count') + 1
        )


@receiver(post_delete, sender=CafeListItem)
def decrement_list_item_count(sender, instance, **kwargs):
    instance.cafe_list.__class__.objects.filter(pk=instance.cafe_list_id).update(
        item_count=F('item_count') - 1
    )
