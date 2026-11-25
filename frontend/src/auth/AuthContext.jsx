import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { clearSession } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi mở lại trang: nếu còn token thì lấy thông tin người dùng
  useEffect(() => {
    if (!localStorage.getItem("access")) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  // Cả hai cách đăng nhập đều trả về cùng một dạng { access, refresh, user }
  const startSession = useCallback((data) => {
    localStorage.setItem("access", data.access);
    localStorage.setItem("refresh", data.refresh);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (username, password) => {
      const { data } = await api.post("/auth/login/", { username, password });
      startSession(data);
    },
    [startSession]
  );

  const loginWithGoogle = useCallback(
    async (credential) => {
      const { data } = await api.post("/auth/google/", { credential });
      startSession(data);
    },
    [startSession]
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      loginWithGoogle,
      logout,
      isAdmin: user?.role === "admin",
      // admin + manager được thêm / sửa tài sản và danh mục
      canWrite: user?.role === "admin" || user?.role === "manager",
    }),
    [user, loading, login, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
