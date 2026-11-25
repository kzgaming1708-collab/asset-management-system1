# Hướng dẫn: dùng Supabase và đăng nhập bằng Google

Làm lần lượt 4 phần. Không phần nào cần gửi mật khẩu hay key cho ai: mọi giá trị chỉ điền vào file `.env` trên máy bạn.

## Phần 1. Tạo database trên Supabase

1. Vào https://supabase.com, đăng nhập, bấm **New project**.
2. Đặt tên project, chọn vùng gần Việt Nam (ví dụ Singapore).
3. Ở ô **Database password**, đặt mật khẩu **chỉ gồm chữ và số** (tránh ký tự `@ # / : ?` làm hỏng chuỗi kết nối). Lưu mật khẩu này lại.
4. Chờ project tạo xong (khoảng 1–2 phút).
5. Bấm nút **Connect** ở đầu trang, chọn mục **Session pooler**, copy chuỗi kết nối. Dạng:
   ```
   postgresql://postgres.<mã-project>:[YOUR-PASSWORD]@aws-0-<vùng>.pooler.supabase.com:5432/postgres
   ```
6. Thay `[YOUR-PASSWORD]` bằng mật khẩu thật (bỏ luôn cặp ngoặc vuông).

Vì sao chọn Session pooler: kết nối trực tiếp của Supabase có thể không chạy trên mạng chỉ có IPv4, còn pooler thì chạy được.

## Phần 2. Tạo Google OAuth Client ID

1. Vào https://console.cloud.google.com, đăng nhập bằng Gmail của bạn.
2. Ở thanh trên cùng, bấm chọn project, rồi **New project**, đặt tên (ví dụ `so-tai-san`) và tạo.
3. Mở menu, vào **APIs & Services → OAuth consent screen** (hoặc **Google Auth Platform**).
   - Nếu được hỏi loại người dùng, chọn **External**.
   - Điền tên app, email hỗ trợ, email liên hệ, rồi lưu.
   - Khi app ở chế độ **Testing**, chỉ các email bạn thêm vào mục **Test users** mới đăng nhập được. Hãy thêm Gmail của bạn và của người cần dùng thử.
4. Vào **Credentials → Create credentials → OAuth client ID**.
   - **Application type**: Web application.
   - **Authorized JavaScript origins**: bấm Add URI, nhập `http://localhost:3000`. Nếu sau này có tên miền thật, thêm `https://ten-mien-cua-ban`.
   - Không cần điền *Authorized redirect URIs* (cách đăng nhập này không dùng redirect).
5. Bấm **Create**, copy **Client ID** (dạng `123456789-abc.apps.googleusercontent.com`). Không cần Client secret.

Lưu ý: Google chỉ cho dùng `http` với địa chỉ `localhost`. Nếu truy cập bằng địa chỉ IP hoặc tên miền thật thì phải là `https`.

## Phần 3. Điền file `.env` và chạy

Trên máy chạy Docker, trong thư mục project:

```bash
cp .env.example .env
nano .env
```

Điền 3 thứ:

```
DJANGO_SECRET_KEY=<chuỗi ngẫu nhiên>
DATABASE_URL=<chuỗi Session pooler đã thay mật khẩu>
GOOGLE_CLIENT_ID=<Client ID từ Google>
```

Tạo `DJANGO_SECRET_KEY` bằng: `python3 -c "import secrets; print(secrets.token_urlsafe(50))"`

Chạy:

```bash
docker compose up --build
```

Backend tự tạo bảng trên Supabase. Nếu log báo lỗi kết nối, kiểm tra lại `DATABASE_URL` (thường do sai mật khẩu hoặc mật khẩu có ký tự đặc biệt).

## Phần 4. Tạo tài khoản admin và bật bảo mật cho Supabase

**Tạo admin.** Đăng nhập bằng Google chỉ cho email đã có sẵn trong hệ thống, nên admin đầu tiên phải tạo bằng dòng lệnh, và **email phải đúng Gmail bạn dùng để đăng nhập**:

```bash
docker compose exec backend python manage.py createsuperuser
```

Nhập username, email (Gmail của bạn) và mật khẩu. Tài khoản này tự có vai trò admin.

**Thêm người khác.** Đăng nhập, vào mục **Người dùng → Thêm người dùng**, điền email Gmail của họ và chọn vai trò. Họ đăng nhập bằng nút Google, hoặc bằng tên đăng nhập và mật khẩu bạn đặt. Người có Gmail nhưng chưa được thêm sẽ thấy thông báo "chưa được cấp quyền".

**Bật RLS (bắt buộc).** Vào Supabase → **SQL Editor** → New query, dán toàn bộ nội dung file `supabase/enable_rls.sql`, bấm Run. Kết quả cuối phải hiện `rowsecurity = true` cho mọi bảng. Việc này chặn người ngoài dùng anon key để đọc thẳng dữ liệu. Backend Django không bị ảnh hưởng. Mỗi lần thêm bảng mới (migration mới) thì chạy lại.

## Kiểm tra

- Mở http://localhost:3000, thấy nút **Đăng nhập bằng Google** dưới form đăng nhập.
- Đăng nhập bằng Gmail đã thêm: vào được, vai trò đúng như đã gán.
- Đăng nhập bằng một Gmail chưa thêm: báo "chưa được cấp quyền".
- Trong Supabase → **Table Editor**: thấy các bảng `accounts_user`, `assets_asset`, `assets_category`.
- Kiểm tra bằng dòng lệnh: `docker compose exec backend python manage.py shell -c "from assets.models import Asset; print(Asset.objects.count())"`

## Lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Không thấy nút Google | `GOOGLE_CLIENT_ID` trống hoặc chưa build lại. Sau khi sửa `.env`, chạy `docker compose up -d --build`. |
| Nút Google báo lỗi `origin_mismatch` | Chưa thêm `http://localhost:3000` vào *Authorized JavaScript origins*, hoặc bạn mở app bằng địa chỉ khác (ví dụ IP). |
| Google báo "Access blocked" / app chưa xác minh | App đang ở chế độ Testing: thêm email vào **Test users**. |
| Backend không khởi động, lỗi `password authentication failed` | Sai mật khẩu trong `DATABASE_URL`. |
| Lỗi `could not translate host name` hoặc `Network is unreachable` | Đang dùng chuỗi kết nối trực tiếp thay vì **Session pooler**. |
| Backend báo "chưa cấu hình database" rồi dừng | `DATABASE_URL` trong `.env` đang trống. |
