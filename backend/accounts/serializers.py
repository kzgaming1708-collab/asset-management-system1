from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Dùng cho quản trị viên quản lý người dùng."""

    password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "department",
            "role",
            "is_active",
            "date_joined",
        ]
        read_only_fields = ["date_joined"]

    def get_full_name(self, obj) -> str:
        return obj.display_name

    def validate(self, attrs):
        password = attrs.get("password")
        if self.instance is None and not password:
            raise serializers.ValidationError({"password": "Mật khẩu là bắt buộc khi tạo người dùng."})
        if password:
            validate_password(password, self.instance)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ProfileSerializer(serializers.ModelSerializer):
    """Thông tin cá nhân của chính người đăng nhập."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "department",
            "role",
            "is_active",
        ]
        read_only_fields = ["id", "username", "role", "is_active"]

    def get_full_name(self, obj) -> str:
        return obj.display_name


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mật khẩu hiện tại không đúng.")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField(help_text="ID token (JWT) mà Google trả về cho nút Đăng nhập bằng Google.")


class LoginSerializer(TokenObtainPairSerializer):
    """Đăng nhập: trả về access + refresh token và thông tin người dùng."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = ProfileSerializer(self.user).data
        return data
