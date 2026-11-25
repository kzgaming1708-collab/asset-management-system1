from rest_framework import serializers

from .models import Asset, AssetStatus, Category


class CategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "description", "asset_count", "created_at"]
        read_only_fields = ["created_at"]


class AssetSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Asset
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "status",
            "status_display",
            "purchase_date",
            "purchase_price",
            "location",
            "assigned_to",
            "assigned_to_name",
            "note",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def get_category_name(self, obj) -> str | None:
        return obj.category.name if obj.category else None

    def get_assigned_to_name(self, obj) -> str | None:
        return obj.assigned_to.display_name if obj.assigned_to else None

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.display_name if obj.created_by else None

    def validate_code(self, value):
        return value.strip()

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", AssetStatus.IN_STOCK))
        assigned_to = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        if assigned_to and status in (AssetStatus.IN_STOCK, AssetStatus.DISPOSED):
            raise serializers.ValidationError(
                {"assigned_to": "Tài sản đang giao cho người dùng thì không thể ở trạng thái Trong kho hoặc Đã thanh lý."}
            )
        return attrs
