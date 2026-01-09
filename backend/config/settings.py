from pathlib import Path
import environ
from datetime import timedelta

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Environment variables
env = environ.Env(
    DEBUG=(bool, False)
)

# Read .env file
environ.Env.read_env(BASE_DIR / '.env')

# Security
SECRET_KEY = env('SECRET_KEY')

# Validate SECRET_KEY
if not SECRET_KEY or SECRET_KEY.startswith('django-insecure'):
    raise ValueError(
        "SECRET_KEY must be set in environment variables and must be secure. "
        "Generate one using: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'"
    )

DEBUG = env('DEBUG')
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',  # Required by allauth

    # Third-party apps
    'rest_framework',
    # Removed: 'rest_framework.authtoken' - Using JWT instead
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'drf_spectacular',

    # Django Allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',

    # Local apps
    'apps.accounts',
    'apps.cafes',
    'apps.reviews',
    'apps.activity',  # Activity stream for feeds
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Static files
    'corsheaders.middleware.CorsMiddleware',  # CORS - must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',  # Required by django-allauth
    'core.middleware.SecurityHeadersMiddleware',  # Custom security headers
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# Using PostgreSQL (regular, not PostGIS)
DATABASES = {
    'default': env.db('DATABASE_URL', default='postgresql://localhost/canitfwc'),
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Cache Configuration (required for DRF throttling)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (user uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.JWTCookieAuthentication',  # Custom cookie-based JWT auth
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'reviews': '10/hour',  # Custom rate for creating reviews
        'bulk': '100/hour',  # Custom rate for bulk endpoints
        'auth': '5/min',  # OAuth/Login endpoints (strict)
        'registration': '3/hour',  # Account creation (very strict)
        'nearby_anon': '5/min',  # Expensive Google Places API calls (anon)
        'nearby_auth': '20/min',  # Expensive Google Places API calls (auth)
    }
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),

    # Cookie-based token storage for XSS protection
    'AUTH_COOKIE': 'access_token',           # Cookie name for access token
    'AUTH_COOKIE_REFRESH': 'refresh_token',  # Cookie name for refresh token
    'AUTH_COOKIE_SECURE': not DEBUG,         # HTTPS only in production
    'AUTH_COOKIE_HTTP_ONLY': True,           # Prevent JavaScript access (XSS protection)
    'AUTH_COOKIE_PATH': '/',                 # Available on all paths
    'AUTH_COOKIE_SAMESITE': 'Lax',          # CSRF protection (Lax allows navigation)
    'AUTH_COOKIE_DOMAIN': None,              # Current domain only
}

# CORS Settings
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',  # Vite default port
        'http://127.0.0.1:5173',
    ]
)

CORS_ALLOW_CREDENTIALS = True  # Required for cookie-based authentication

# API Documentation (Spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Can-It-WFC API',
    'DESCRIPTION': 'API for WFC cafe review platform',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Security Settings (adjust for production)
if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Supabase Configuration (optional)
SUPABASE_URL = env('SUPABASE_URL', default='')
SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY', default='')
SUPABASE_SERVICE_KEY = env('SUPABASE_SERVICE_KEY', default='')

# Google Places API (optional)
GOOGLE_PLACES_API_KEY = env('GOOGLE_PLACES_API_KEY', default='')

# Google Places Search Configuration
GOOGLE_PLACES_MAX_RESULTS = env.int('GOOGLE_PLACES_MAX_RESULTS', default=60)  # Max: 60 (3 pages × 20)
GOOGLE_PLACES_ENABLE_PAGINATION = env.bool('GOOGLE_PLACES_ENABLE_PAGINATION', default=True)
GOOGLE_PLACES_TIMEOUT = env.int('GOOGLE_PLACES_TIMEOUT', default=10)  # seconds

# Email Configuration (for password reset, etc.)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # Development
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # Production

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',  # Only log SQL warnings/errors
            'propagate': False,
        },
        'apps.cafes': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.reviews': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.accounts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Anti-spam settings
MAX_REVIEWS_PER_DAY = 10
MIN_ACCOUNT_AGE_HOURS = 0
DUPLICATE_CAFE_DISTANCE_METERS = 50  # Distance threshold for duplicate detection

# Django Sites Framework (required by allauth)
SITE_ID = 1

# Django Allauth Configuration
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'optional'  # Can be 'none', 'optional', 'mandatory'
ACCOUNT_AUTHENTICATION_METHOD = 'email'  # Use email for authentication
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_USER_MODEL_USERNAME_FIELD = 'username'
ACCOUNT_USER_MODEL_EMAIL_FIELD = 'email'
SOCIALACCOUNT_AUTO_SIGNUP = True  # Automatically create account on social login
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'  # Skip email verification for social accounts

# dj-rest-auth configuration
REST_USE_JWT = True
JWT_AUTH_COOKIE = 'can-it-wfc-auth'
JWT_AUTH_REFRESH_COOKIE = 'can-it-wfc-refresh'
JWT_AUTH_HTTPONLY = env.bool('JWT_AUTH_HTTPONLY', default=not DEBUG)  # True in production (DEBUG=False)

# Configure dj-rest-auth to not use token auth (using JWT instead)
REST_AUTH = {
    'TOKEN_MODEL': None,
}

# Google OAuth Settings
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': env('GOOGLE_OAUTH_CLIENT_ID', default=''),
            'secret': env('GOOGLE_OAUTH_CLIENT_SECRET', default=''),
            'key': ''
        }
    }
}

# Google OAuth Callback URL
GOOGLE_OAUTH_CALLBACK_URL = env('GOOGLE_OAUTH_CALLBACK_URL', default='http://localhost:3000/auth/google/callback')
