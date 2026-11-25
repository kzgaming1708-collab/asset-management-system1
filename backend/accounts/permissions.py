"""Các lớp phân quyền RBAC dùng chung cho toàn bộ API.

Ma trận quyền:
    - admin   : đọc / thêm / sửa / xoá mọi thứ, quản lý người dùng
    - manager : đọc / thêm / sửa tài sản và danh mục (không xoá, không quản lý user)
    - viewer  : chỉ đọc
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import Role


def get_role(user):
    if user and user.is_authenticated:
        return user.role
    return None


class IsAdminRole(BasePermission):
    message = "Chỉ quản trị viên mới có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        return get_role(request.user) == Role.ADMIN


class IsAdminOrManager(BasePermission):
    message = "Chỉ quản trị viên hoặc quản lý mới có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        return get_role(request.user) in (Role.ADMIN, Role.MANAGER)


class ManagerWriteAdminDelete(BasePermission):
    """Đọc: mọi người đã đăng nhập. Thêm/sửa: admin + manager. Xoá: chỉ admin."""

    message = "Bạn không có quyền thực hiện thao tác này."

    def has_permission(self, request, view):
        role = get_role(request.user)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == "DELETE":
            return role == Role.ADMIN
        return role in (Role.ADMIN, Role.MANAGER)
