from .settings import *  # noqa: F403


# Keep tests local and deterministic. The default development database may point
# at remote Supabase/Postgres, which makes hundreds of small test transactions
# extremely slow and risks test data crossing environments.
DATABASES = {
    'default': env.db(  # noqa: F405
        'TEST_DATABASE_URL',
        default='postgresql://can_it_wfc:can_it_wfc@localhost:5433/can_it_wfc',
    )
}
DATABASES['default']['TEST'] = {'NAME': env('TEST_DATABASE_NAME', default='test_can_it_wfc')}  # noqa: F405

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
    }
}
