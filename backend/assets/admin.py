from django.contrib import admin

from .models import Asset, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "created_at")
    search_fields = ("name",)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "status", "assigned_to", "purchase_price")
    list_filter = ("status", "category")
    search_fields = ("code", "name", "location")
