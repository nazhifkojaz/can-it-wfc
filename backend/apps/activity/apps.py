from django.apps import AppConfig


class ActivityConfig(AppConfig):
    """Configuration for activity app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.activity'
    verbose_name = 'Activity Stream'

    def ready(self):
        """
        Called when app is ready.
        Registers signals for auto-creating activities.
        """
        import apps.activity.signals  # noqa
