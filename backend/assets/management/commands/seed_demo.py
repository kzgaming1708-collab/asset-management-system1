"""Tạo dữ liệu mẫu: 3 tài khoản (admin / manager / viewer), danh mục và tài sản.

Chạy lại nhiều lần vẫn an toàn (không tạo trùng).
    python manage.py seed_demo
"""
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import Role, User
from assets.models import Asset, AssetStatus, Category

DEMO_USERS = [
    # username, password, role, first_name, last_name, email
    ("admin", "Admin@123", Role.ADMIN, "Quản trị", "Viên", "admin@example.com"),
    ("manager", "Manager@123", Role.MANAGER, "Nguyễn Văn", "Quản Lý", "manager@example.com"),
    ("viewer", "Viewer@123", Role.VIEWER, "Trần Thị", "Xem", "viewer@example.com"),
]

DEMO_CATEGORIES = [
    ("Laptop", "Máy tính xách tay"),
    ("Màn hình", "Màn hình máy tính"),
    ("Nội thất", "Bàn ghế, tủ"),
    ("Thiết bị mạng", "Router, switch, access point"),
    ("Máy in", "Máy in, máy scan"),
]

# code, name, category, status, purchase_date, price, location, assignee username
DEMO_ASSETS = [
    ("LT-001", "Dell XPS 15", "Laptop", AssetStatus.IN_USE, date(2026, 1, 12), 38000000, "Phòng Kỹ thuật", "manager"),
    ("LT-002", "MacBook Pro 14", "Laptop", AssetStatus.IN_USE, date(2026, 2, 3), 52000000, "Phòng Thiết kế", "viewer"),
    ("LT-003", "Lenovo ThinkPad T14", "Laptop", AssetStatus.IN_STOCK, date(2026, 3, 20), 24500000, "Kho tầng 1", None),
    ("MH-001", "Dell UltraSharp 27", "Màn hình", AssetStatus.IN_USE, date(2026, 2, 18), 9800000, "Phòng Kỹ thuật", "manager"),
    ("MH-002", "LG 24 inch", "Màn hình", AssetStatus.IN_STOCK, date(2026, 4, 5), 3900000, "Kho tầng 1", None),
    ("NT-001", "Bàn làm việc 1m6", "Nội thất", AssetStatus.IN_USE, date(2025, 11, 25), 2800000, "Phòng Kế toán", "viewer"),
    ("NT-002", "Ghế công thái học", "Nội thất", AssetStatus.IN_USE, date(2025, 12, 8), 4200000, "Phòng Kế toán", "viewer"),
    ("NT-003", "Tủ hồ sơ 4 ngăn", "Nội thất", AssetStatus.DISPOSED, date(2023, 6, 14), 1500000, "Kho tầng 2", None),
    ("MN-001", "Router Cisco ISR", "Thiết bị mạng", AssetStatus.IN_USE, date(2026, 5, 9), 17500000, "Phòng Server", "admin"),
    ("MN-002", "Switch 24 cổng PoE", "Thiết bị mạng", AssetStatus.MAINTENANCE, date(2026, 6, 22), 8900000, "Phòng Server", "admin"),
    ("MI-001", "Máy in HP LaserJet", "Máy in", AssetStatus.MAINTENANCE, date(2026, 7, 1), 6700000, "Phòng Hành chính", "manager"),
    ("MI-002", "Máy scan Epson", "Máy in", AssetStatus.IN_STOCK, date(2026, 8, 15), 5400000, "Kho tầng 1", None),
]


class Command(BaseCommand):
    help = "Tạo dữ liệu mẫu (người dùng, danh mục, tài sản)."

    def handle(self, *args, **options):
        users = {}
        for username, password, role, first, last, email in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "role": role,
                    "first_name": first,
                    "last_name": last,
                    "email": email,
                    "is_staff": role == Role.ADMIN,
                    "is_superuser": role == Role.ADMIN,
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  + user {username} / {password} ({role})")
            users[username] = user

        categories = {}
        for name, description in DEMO_CATEGORIES:
            category, _ = Category.objects.get_or_create(name=name, defaults={"description": description})
            categories[name] = category

        created_count = 0
        for code, name, cat, status, purchased, price, location, assignee in DEMO_ASSETS:
            _, created = Asset.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "category": categories[cat],
                    "status": status,
                    "purchase_date": purchased,
                    "purchase_price": Decimal(price),
                    "location": location,
                    "assigned_to": users.get(assignee) if assignee else None,
                    "created_by": users["admin"],
                },
            )
            created_count += int(created)

        self.stdout.write(self.style.SUCCESS(f"Seed xong: {created_count} tài sản mới."))
