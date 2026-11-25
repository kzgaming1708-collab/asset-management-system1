from rest_framework.test import APITestCase

from accounts.models import Role, User

from .models import Asset, Category

PASSWORD = "Pass12345!x"


class AssetRBACTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin1", password=PASSWORD, role=Role.ADMIN)
        self.manager = User.objects.create_user("manager1", password=PASSWORD, role=Role.MANAGER)
        self.viewer = User.objects.create_user("viewer1", password=PASSWORD, role=Role.VIEWER)
        self.category = Category.objects.create(name="Laptop")
        self.asset = Asset.objects.create(code="LT-001", name="Dell XPS", category=self.category)

    def _as(self, username):
        resp = self.client.post(
            "/api/auth/login/", {"username": username, "password": PASSWORD}, format="json"
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")

    def _payload(self, code="LT-002"):
        return {"code": code, "name": "MacBook", "category": self.category.id, "purchase_price": 1000}

    def test_anonymous_cannot_list(self):
        self.assertEqual(self.client.get("/api/assets/").status_code, 401)

    def test_viewer_can_read_but_not_write(self):
        self._as("viewer1")
        self.assertEqual(self.client.get("/api/assets/").status_code, 200)
        self.assertEqual(self.client.post("/api/assets/", self._payload(), format="json").status_code, 403)

    def test_manager_can_create_and_update_but_not_delete(self):
        self._as("manager1")
        created = self.client.post("/api/assets/", self._payload(), format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["created_by"], self.manager.id)

        patched = self.client.patch(
            f"/api/assets/{self.asset.id}/", {"location": "Phòng IT"}, format="json"
        )
        self.assertEqual(patched.status_code, 200)

        self.assertEqual(self.client.delete(f"/api/assets/{self.asset.id}/").status_code, 403)

    def test_admin_can_delete(self):
        self._as("admin1")
        self.assertEqual(self.client.delete(f"/api/assets/{self.asset.id}/").status_code, 204)

    def test_cannot_assign_asset_that_is_in_stock(self):
        self._as("manager1")
        payload = self._payload("LT-003")
        payload.update({"status": "in_stock", "assigned_to": self.viewer.id})
        resp = self.client.post("/api/assets/", payload, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_summary_report(self):
        self._as("viewer1")
        resp = self.client.get("/api/reports/summary/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["totals"]["count"], 1)
