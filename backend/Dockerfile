FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install gunicorn for production-grade serving
RUN pip install --no-cache-dir gunicorn==21.2.0

COPY . .

EXPOSE 8000

# Run migrations then serve with Gunicorn (multi-worker, production grade)
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn dayflow.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120 --log-level info"]
