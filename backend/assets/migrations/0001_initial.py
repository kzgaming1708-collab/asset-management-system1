import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Category",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100, unique=True)),
                ("description", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name_plural": "categories",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Asset",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=50, unique=True)),
                ("name", models.CharField(max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("in_stock", "Trong kho"),
                            ("in_use", "Đang sử dụng"),
                            ("maintenance", "Bảo trì"),
                            ("disposed", "Đã thanh lý"),
                        ],
                        default="in_stock",
                        max_length=20,
                    ),
                ),
                ("purchase_date", models.DateField(blank=True, null=True)),
                (
                    "purchase_price",
                    models.DecimalField(
                        decimal_places=2,
                        default=0,
                        max_digits=15,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                ("location", models.CharField(blank=True, max_length=200)),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assets",
                        to="assets.category",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        editable=False,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_assets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
