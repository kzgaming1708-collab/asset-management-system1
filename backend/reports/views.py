import csv

from django.db.models import Count, F, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from assets.models import Asset, AssetStatus


def _num(value):
    return float(value or 0)


class SummaryReportView(APIView):
    """Báo cáo tổng hợp để vẽ biểu đồ (mọi vai trò đã đăng nhập đều xem được)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        qs = Asset.objects.all()
        status_labels = dict(AssetStatus.choices)

        total = qs.aggregate(count=Count("id"), value=Sum("purchase_price"))

        by_status_rows = (
            qs.values("status")
            .annotate(count=Count("id"), value=Sum("purchase_price"))
            .order_by("status")
        )
        by_status = [
            {
                "status": row["status"],
                "label": status_labels.get(row["status"], row["status"]),
                "count": row["count"],
                "value": _num(row["value"]),
            }
            for row in by_status_rows
        ]
        status_count = {row["status"]: row["count"] for row in by_status}

        by_category_rows = (
            qs.values(category_name=F("category__name"))
            .annotate(count=Count("id"), value=Sum("purchase_price"))
            .order_by("category_name")
        )
        by_category = [
            {
                "category": row["category_name"] or "Chưa phân loại",
                "count": row["count"],
                "value": _num(row["value"]),
            }
            for row in by_category_rows
        ]

        by_month_rows = (
            qs.exclude(purchase_date__isnull=True)
            .annotate(month=TruncMonth("purchase_date"))
            .values("month")
            .annotate(count=Count("id"), value=Sum("purchase_price"))
            .order_by("month")
        )
        by_month = [
            {
                "month": row["month"].strftime("%Y-%m"),
                "count": row["count"],
                "value": _num(row["value"]),
            }
            for row in by_month_rows
        ]

        return Response(
            {
                "totals": {
                    "count": total["count"] or 0,
                    "value": _num(total["value"]),
                    "in_stock": status_count.get(AssetStatus.IN_STOCK, 0),
                    "in_use": status_count.get(AssetStatus.IN_USE, 0),
                    "maintenance": status_count.get(AssetStatus.MAINTENANCE, 0),
                    "disposed": status_count.get(AssetStatus.DISPOSED, 0),
                },
                "by_status": by_status,
                "by_category": by_category,
                "by_month": by_month,
            }
        )


class ExportCsvView(APIView):
    """Xuất toàn bộ danh sách tài sản ra file CSV (mở được bằng Excel)."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={(200, "text/csv"): OpenApiTypes.BINARY})
    def get(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="bao-cao-tai-san.csv"'
        response.write("﻿")  # BOM để Excel đọc đúng tiếng Việt

        writer = csv.writer(response)
        writer.writerow(
            ["Mã", "Tên", "Danh mục", "Trạng thái", "Ngày mua", "Giá mua", "Vị trí", "Người sử dụng"]
        )
        queryset = Asset.objects.select_related("category", "assigned_to").order_by("code")
        for asset in queryset:
            writer.writerow(
                [
                    asset.code,
                    asset.name,
                    asset.category.name if asset.category else "",
                    asset.get_status_display(),
                    asset.purchase_date.isoformat() if asset.purchase_date else "",
                    asset.purchase_price,
                    asset.location,
                    asset.assigned_to.display_name if asset.assigned_to else "",
                ]
            )
        return response
