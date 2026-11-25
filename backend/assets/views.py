import django_filters
from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import ManagerWriteAdminDelete

from .models import Asset, Category
from .serializers import AssetSerializer, CategorySerializer


class AssetFilter(django_filters.FilterSet):
    purchase_date_from = django_filters.DateFilter(field_name="purchase_date", lookup_expr="gte")
    purchase_date_to = django_filters.DateFilter(field_name="purchase_date", lookup_expr="lte")

    class Meta:
        model = Asset
        fields = ["status", "category", "assigned_to"]


class CategoryViewSet(viewsets.ModelViewSet):
    """Danh mục tài sản. Không phân trang vì số lượng nhỏ."""

    serializer_class = CategorySerializer
    permission_classes = [ManagerWriteAdminDelete]
    pagination_class = None
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return Category.objects.annotate(asset_count=Count("assets")).order_by("name")


class AssetViewSet(viewsets.ModelViewSet):
    """Tài sản. Đọc: mọi vai trò. Thêm/sửa: admin + manager. Xoá: admin."""

    queryset = Asset.objects.select_related("category", "assigned_to", "created_by")
    serializer_class = AssetSerializer
    permission_classes = [ManagerWriteAdminDelete]
    filterset_class = AssetFilter
    search_fields = [
        "code",
        "name",
        "location",
        "assigned_to__username",
        "assigned_to__first_name",
        "assigned_to__last_name",
    ]
    ordering_fields = ["code", "name", "purchase_date", "purchase_price", "status", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @extend_schema(responses=AssetSerializer(many=True))
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        """Tài sản đang được giao cho người dùng hiện tại."""
        queryset = self.filter_queryset(self.get_queryset()).filter(assigned_to=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(queryset, many=True).data)
