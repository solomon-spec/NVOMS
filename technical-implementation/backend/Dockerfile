FROM python:3.13-slim

# System deps needed by psycopg2 and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer-cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir gunicorn

# Copy project source
COPY . .

# Collect static files (non-fatal if storage backend isn't configured yet)
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Default: run the web server. Overridden per-service in render.yaml / docker-compose.yml
CMD ["gunicorn", "nvoms.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
