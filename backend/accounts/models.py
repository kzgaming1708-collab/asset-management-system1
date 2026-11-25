from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    ADMIN = "admin", "Quản trị viên"
    MANAGER = "manager", "Quản lý"
    VIEWER = "viewer", "Người xem"


class User(AbstractUser):
    """Người dùng tuỳ biến, có thêm vai trò (RBAC)."""

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.VIEWER)
    phone = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        # Superuser luôn là admin để không bị lệch quyền giữa Django admin và API.
        if self.is_superuser:
            self.role = Role.ADMIN
        super().save(*args, **kwargs)

    @property
    def display_name(self):
        return self.get_full_name() or self.username
