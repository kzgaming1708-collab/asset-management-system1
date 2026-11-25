from unittest import mock

from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Role, User

VERIFY = "accounts.views.google_id_token.verify_oauth2_token"


@override_settings(GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com")
class GoogleLoginTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            "manager1", password="Pass12345!x", role=Role.MANAGER, email="Manager@Gmail.com"
        )

    def _login(self, token_info=None, side_effect=None):
        with mock.patch(VERIFY, return_value=token_info, side_effect=side_effect):
            return self.client.post("/api/auth/google/", {"credential": "x"}, format="json")

    def test_known_email_gets_jwt_with_existing_role(self):
        resp = self._login({"email": "manager@gmail.com", "email_verified": True})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("access", resp.data)
        self.assertEqual(resp.data["user"]["role"], "manager")
        self.assertEqual(resp.data["user"]["username"], "manager1")

    def test_unknown_email_is_rejected(self):
        resp = self._login({"email": "stranger@gmail.com", "email_verified": True})
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(User.objects.filter(email__iexact="stranger@gmail.com").exists())

    def test_unverified_email_is_rejected(self):
        resp = self._login({"email": "manager@gmail.com", "email_verified": False})
        self.assertEqual(resp.status_code, 401)

    def test_invalid_token_is_rejected(self):
        resp = self._login(side_effect=ValueError("bad token"))
        self.assertEqual(resp.status_code, 401)

    def test_inactive_user_is_rejected(self):
        self.manager.is_active = False
        self.manager.save()
        resp = self._login({"email": "manager@gmail.com", "email_verified": True})
        self.assertEqual(resp.status_code, 403)

    def test_config_exposes_client_id(self):
        resp = self.client.get("/api/auth/config/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["google_client_id"], "test-client-id.apps.googleusercontent.com")

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_returns_503_when_not_configured(self):
        resp = self.client.post("/api/auth/google/", {"credential": "x"}, format="json")
        self.assertEqual(resp.status_code, 503)


class AuthTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user("admin1", password="Pass12345!x", role=Role.ADMIN)
        self.viewer = User.objects.create_user("viewer1", password="Pass12345!x", role=Role.VIEWER)

    def _login(self, username):
        resp = self.client.post(
            "/api/auth/login/", {"username": username, "password": "Pass12345!x"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        return resp.data

    def test_login_returns_tokens_and_user(self):
        data = self._login("admin1")
        self.assertIn("access", data)
        self.assertIn("refresh", data)
        self.assertEqual(data["user"]["role"], "admin")

    def test_login_wrong_password(self):
        resp = self.client.post(
            "/api/auth/login/", {"username": "admin1", "password": "sai"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_only_admin_can_list_users(self):
        token = self._login("viewer1")["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/users/").status_code, 403)

        token = self._login("admin1")["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get("/api/users/").status_code, 200)

    def test_admin_cannot_delete_self(self):
        token = self._login("admin1")["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        resp = self.client.delete(f"/api/users/{self.admin.id}/")
        self.assertEqual(resp.status_code, 400)
