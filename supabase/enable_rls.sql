-- Chạy trong Supabase > SQL Editor SAU KHI backend đã migrate (đã có bảng).
--
-- Vì sao cần: Supabase tự mở API công khai (Data API) cho schema "public". Các bảng của Django
-- nằm ở đó, nên nếu không bật RLS thì ai có anon key (key này nằm trong dashboard và hay bị
-- lộ) đều có thể đọc/ghi thẳng dữ liệu, bỏ qua mọi phân quyền của app.
--
-- Bật RLS mà không tạo policy nào = chặn toàn bộ truy cập qua Data API.
-- Django kết nối bằng tài khoản postgres của bạn nên KHÔNG bị ảnh hưởng.
--
-- Mỗi lần thêm bảng mới (migration mới), chạy lại đoạn này.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Kiểm tra: cột rowsecurity phải là true cho mọi bảng
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
