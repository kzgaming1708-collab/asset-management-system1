#!/bin/sh
set -e

# Chặn chạy nhầm: không có database thật thì dữ liệu nằm trong container và mất khi khởi động lại.
if [ -z "$DATABASE_URL" ] && [ -z "$POSTGRES_HOST" ] && [ "$DJANGO_DEBUG" != "1" ]; then
  echo "LỖI: chưa cấu hình database."
  echo "  - Dùng Supabase: điền DATABASE_URL trong file .env"
  echo "  - Dùng Postgres trong Docker: chạy với -f docker-compose.yml -f docker-compose.local.yml"
  exit 1
fi

echo "==> Chạy migrate"
python manage.py migrate --noinput

echo "==> Gom static files"
python manage.py collectstatic --noinput

if [ "$SEED_DEMO_DATA" = "1" ]; then
  echo "==> Tạo dữ liệu mẫu"
  python manage.py seed_demo
fi

echo "==> Khởi động gunicorn"
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --access-logfile -
