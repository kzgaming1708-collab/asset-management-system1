# Sổ tài sản

Ứng dụng quản lý tài sản: **Django REST + PostgreSQL** (backend), **React + Vite** (frontend), đăng nhập **JWT** và **Google**, phân quyền **RBAC**, tài liệu **Swagger**, báo cáo biểu đồ, chạy bằng **Docker Compose**. Database có thể là **Supabase** hoặc PostgreSQL trong Docker.

## Cấu trúc thư mục

```
asset-management/
├── docker-compose.yml          # backend + frontend (database bên ngoài, vd Supabase)
├── docker-compose.local.yml    # thêm PostgreSQL trong Docker để chạy thử
├── .env.example                # mẫu biến môi trường (copy thành .env)
├── backend/                    # Django + DRF
│   ├── config/                 # settings, urls
│   ├── accounts/               # User, đăng nhập JWT + Google, RBAC, quản lý người dùng
│   ├── assets/                 # Category, Asset, lệnh seed_demo
│   └── reports/                # báo cáo tổng hợp + xuất CSV
├── frontend/                   # React + Vite + Recharts
│   └── src/                    # api.js, auth/, components/, pages/, styles.css
├── supabase/enable_rls.sql     # bật RLS cho Supabase (bắt buộc)
├── docs/                       # hướng dẫn chi tiết
└── postman/                    # collection để import vào Postman
```

## Chạy với Supabase + đăng nhập Google

Làm theo [docs/HUONG-DAN-SUPABASE-GOOGLE.md](docs/HUONG-DAN-SUPABASE-GOOGLE.md). Tóm tắt:

```bash
cp .env.example .env     # điền DJANGO_SECRET_KEY, DATABASE_URL, GOOGLE_CLIENT_ID
docker compose up --build
docker compose exec backend python manage.py createsuperuser   # email = Gmail của bạn
```

Sau đó chạy `supabase/enable_rls.sql` trong Supabase SQL Editor.

## Chạy thử với PostgreSQL trong Docker (không cần Supabase)

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Chế độ này tự tạo dữ liệu mẫu và hiện nút điền sẵn tài khoản demo ở trang đăng nhập.

| Dịch vụ       | Địa chỉ                          |
|---------------|----------------------------------|
| Giao diện web | http://localhost:3000            |
| Swagger UI    | http://localhost:8000/api/docs/  |
| Django admin  | http://localhost:8000/admin/     |

Tài khoản mẫu (chỉ ở chế độ chạy thử): `admin / Admin@123`, `manager / Manager@123`, `viewer / Viewer@123`.

> Khi chạy thật: để `SEED_DEMO_DATA=0`, đặt `DJANGO_SECRET_KEY` riêng, và không dùng tài khoản mẫu.

## Đăng nhập

- **Mật khẩu**: `POST /api/auth/login/`.
- **Google**: người dùng chọn tài khoản Google, backend kiểm tra token với Google rồi **chỉ cho vào nếu email đã được admin tạo sẵn** trong mục Người dùng. Vai trò lấy từ tài khoản đó. Hai cách đều trả về cùng một loại JWT.

## Phân quyền (RBAC)

| Chức năng                        | admin | manager | viewer |
|----------------------------------|:-----:|:-------:|:------:|
| Xem tài sản, danh mục, báo cáo   |  ✅   |   ✅    |   ✅   |
| Thêm / sửa tài sản, danh mục     |  ✅   |   ✅    |   ❌   |
| Xoá tài sản, danh mục            |  ✅   |   ❌    |   ❌   |
| Quản lý người dùng               |  ✅   |   ❌    |   ❌   |

Phân quyền được kiểm tra ở **backend** (`backend/accounts/permissions.py`); frontend chỉ ẩn/hiện nút.

## Chạy không dùng Docker (để phát triển)

```bash
# Backend (không đặt DATABASE_URL thì dùng SQLite)
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver                            # http://localhost:8000

# Frontend
cd frontend
npm install
npm run dev                                           # http://localhost:5173
```

Chạy test backend: `python manage.py test`. Nếu sửa model: `python manage.py makemigrations && python manage.py migrate`.

## API chính

| Method | Đường dẫn | Mô tả |
|--------|-----------|-------|
| POST | `/api/auth/login/` | Đăng nhập mật khẩu, trả `access`, `refresh`, `user` |
| POST | `/api/auth/google/` | Đăng nhập Google, body `{"credential": "<id token>"}` |
| GET | `/api/auth/config/` | Cấu hình công khai (Google Client ID) |
| POST | `/api/auth/refresh/` | Làm mới access token |
| GET/PATCH | `/api/auth/me/` | Thông tin cá nhân |
| POST | `/api/auth/change-password/` | Đổi mật khẩu |
| CRUD | `/api/users/` | Quản lý người dùng (admin) |
| CRUD | `/api/categories/` | Danh mục |
| CRUD | `/api/assets/` | Tài sản, hỗ trợ `search`, `status`, `category`, `ordering`, `page` |
| GET | `/api/assets/mine/` | Tài sản đang giao cho tôi |
| GET | `/api/reports/summary/` | Số liệu cho biểu đồ |
| GET | `/api/reports/export/` | Tải CSV |

Test API bằng **Swagger** (`/api/docs/` → nút *Authorize*, nhập `Bearer <access_token>`) hoặc **Postman** (import file trong `postman/`, chạy request *Đăng nhập* trước).
