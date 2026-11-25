import { useCallback, useEffect, useState } from "react";

// Đọc giao diện đã được index.html áp dụng; cho phép đổi và nhớ lại lựa chọn.
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // trình duyệt chặn localStorage: bỏ qua, chỉ không nhớ được lựa chọn
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return [theme, toggle];
}
