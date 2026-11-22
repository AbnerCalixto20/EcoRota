from django.apps import AppConfig
from django.db.backends.signals import connection_created


def enable_sqlite_foreign_keys(sender, connection, **kwargs):
    if connection.vendor == "sqlite":
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = ON;")
            cursor.execute("PRAGMA busy_timeout = 5000;")


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"
    verbose_name = "EcoRota USP"

    def ready(self):
        connection_created.connect(enable_sqlite_foreign_keys)
