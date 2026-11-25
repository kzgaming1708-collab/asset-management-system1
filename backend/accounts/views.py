from django.conf import settings
from django.contrib.auth.models import update_last_login
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Role, User
from .permissions import IsAdminOrManager, IsAdminRole
from .serializers import (
    ChangePasswordSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    ProfileSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    """Đăng nhập bằng username + password, nhận JWT."""

    serializer_class = LoginSerializer


class AuthConfigView(APIView):
    """Cấu hình công khai cho trang đăng nhập (frontend dùng để quyết định có hiện nút Google)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        return Response({"google_client_id": settings.GOOGLE_CLIENT_ID})


class GoogleLoginView(APIView):
    """Đăng nhập bằng Google.

    Frontend gửi ID token của Google. Backend kiểm tra token với Google, rồi chỉ cho vào
    nếu email đã được quản trị viên tạo sẵn trong mục Người dùng. Vai trò (RBAC) lấy từ
    tài khoản đó; kết quả trả về giống hệt đăng nhập bằng mật khẩu.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(request=GoogleLoginSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_id = settings.GOOGLE_CLIENT_ID
        if not client_id:
            return Response(
                {"detail": "Máy chủ chưa cấu hình đăng nhập bằng Google."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            info = google_id_token.verify_oauth2_token(
                serializer.validated_data["credential"],
                google_requests.Request(),
                client_id,
            )
        except ValueError:
            return Response(
                {"detail": "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn. Hãy thử lại."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        email = (info.get("email") or "").strip()
        if not email or not info.get("email_verified"):
            return Response(
                {"detail": "Email Google này chưa được xác minh nên không dùng để đăng nhập được."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        matches = list(User.objects.filter(email__iexact=email)[:2])
        if not matches:
            return Response(
                {
                    "detail": f"Email {email} chưa được cấp quyền. "
                    "Liên hệ quản trị viên để được thêm vào hệ thống."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if len(matches) > 1:
            return Response(
                {"detail": "Email này gắn với nhiều tài khoản. Liên hệ quản trị viên để xử lý."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user = matches[0]
        if not user.is_active:
            return Response(
                {"detail": "Tài khoản này đã bị khoá."}, status=status.HTTP_403_FORBIDDEN
            )

        update_last_login(None, user)
        refresh = LoginSerializer.get_token(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": ProfileSerializer(user).data,
            }
        )


class MeView(RetrieveUpdateAPIView):
    """Xem / cập nhật thông tin cá nhân của người đang đăng nhập."""

    serializer_class = ProfileSerializer
    pagination_class = None

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    @extend_schema(request=ChangePasswordSerializer, responses={200: OpenApiTypes.OBJECT})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Đổi mật khẩu thành công."})


class UserViewSet(viewsets.ModelViewSet):
    """Quản lý người dùng - chỉ dành cho quản trị viên."""

    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "first_name", "last_name", "email"]
    ordering_fields = ["id", "username", "date_joined"]

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance == self.request.user:
            new_role = serializer.validated_data.get("role", instance.role)
            new_active = serializer.validated_data.get("is_active", instance.is_active)
            if new_role != Role.ADMIN or not new_active:
                raise ValidationError(
                    "Bạn không thể tự hạ quyền hoặc vô hiệu hoá tài khoản của chính mình."
                )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if self.get_object() == request.user:
            return Response(
                {"detail": "Bạn không thể tự xoá tài khoản của mình."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    @action(detail=False, methods=["get"], permission_classes=[IsAdminOrManager])
    def lookup(self, request):
        """Danh sách rút gọn (id, tên) để chọn người được giao tài sản."""
        users = User.objects.filter(is_active=True).order_by("first_name", "username")
        return Response([{"id": u.id, "name": u.display_name} for u in users])
