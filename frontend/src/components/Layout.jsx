import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { ROLE_LABELS } from "../constants.js";
import { useTheme } from "../hooks/useTheme.js";
import Avatar from "./Avatar.jsx";
import BrandMark from "./BrandMark.jsx";
import Icon from "./Icon.jsx";

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const themeLabel = theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="Sổ tài sản, về trang báo cáo">
            <BrandMark />
            <span>Sổ tài sản</span>
          </NavLink>

          <nav className="nav" aria-label="Điều hướng chính">
            <NavLink to="/" end>
              Báo cáo
            </NavLink>
            <NavLink to="/assets">Tài sản</NavLink>
            <NavLink to="/categories">Danh mục</NavLink>
            {isAdmin && <NavLink to="/users">Người dùng</NavLink>}
          </nav>

          <div className="topbar-actions">
            <a
              className="btn btn-quiet btn-sm"
              href="/api/docs/"
              target="_blank"
              rel="noreferrer"
              title="Mở tài liệu API (Swagger)"
            >
              <Icon name="external" size={15} />
              <span className="hide-sm">API</span>
            </a>
            <button className="icon-btn" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <div className="user">
              <Avatar name={user.full_name} size={32} />
              <div className="user-meta">
                <strong>{user.full_name}</strong>
                <span>{ROLE_LABELS[user.role]}</span>
              </div>
            </div>
            <button className="btn btn-quiet btn-sm" onClick={onLogout}>
              <Icon name="logout" size={15} />
              <span className="hide-sm">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
