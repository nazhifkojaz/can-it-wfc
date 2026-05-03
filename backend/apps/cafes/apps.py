from django.apps import AppConfig


class CafesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cafes'

    def ready(self):
        import apps.cafes.signals  # noqa
