FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies using uv
RUN uv sync --no-dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run migrations and start Gunicorn
CMD . .venv/bin/activate && \
    python manage.py migrate --noinput && \
    gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2

# Run migrations and start Gunicorn
# CMD python manage.py collectstatic --noinput && \
#     python manage.py migrate --noinput && \
#     gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2
