import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

// Chặn truy cập khi chưa đăng nhập; có thể giới hạn theo vai trò (roles).
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="center-screen">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
