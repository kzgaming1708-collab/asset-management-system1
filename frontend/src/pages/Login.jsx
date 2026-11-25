import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import BrandMark from "../components/BrandMark.jsx";
import Field from "../components/Field.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import Icon from "../components/Icon.jsx";

// Tài khoản mẫu do lệnh seed_demo tạo ra; bấm để điền sẵn vào form
const DEMO_ACCOUNTS = [
  { label: "Quản trị viên", username: "admin", password: "Admin@123" },
  { label: "Quản lý", username: "manager", password: "Manager@123" },
  { label: "Người xem", username: "viewer", password: "Viewer@123" },
];

// Chỉ hiện gợi ý tài khoản mẫu khi build với VITE_SHOW_DEMO=1 (mặc định tắt, tránh lộ khi chạy thật)
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === "1";

export default function Login() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Tên đăng nhập hoặc mật khẩu không đúng. Kiểm tra lại rồi thử lần nữa."
          : errorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async (credential) => {
    setBusy(true);
    setError("");
    try {
      await loginWithGoogle(credential);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  };

  return (
    <div className="login">
      <aside className="login-side">
        <div className="brand">
          <BrandMark size={28} />
          <span>Sổ tài sản</span>
        </div>
        <div>
          <h2>Biết từng tài sản đang ở đâu, ai đang giữ.</h2>
          <p>Theo dõi máy móc, thiết bị và nội thất của cả đơn vị trong một sổ duy nhất.</p>
        </div>
        <svg className="bigtag" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
            fill="#f2c230"
          />
          <circle cx="7.5" cy="7.5" r="1.6" fill="#14202b" />
        </svg>
      </aside>

      <main className="login-main">
        <form className="login-form" onSubmit={onSubmit}>
          <h1>Đăng nhập</h1>
          <p>Dùng tài khoản do quản trị viên cấp.</p>

          {error && (
            <div className="form-alert" role="alert">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}

          <Field label="Tên đăng nhập">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </Field>

          <Field label="Mật khẩu">
            <div className="password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
          </Field>

          <button className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner" />}
            {busy ? "Đang đăng nhập" : "Đăng nhập"}
          </button>

          <GoogleButton onCredential={onGoogle} />

          {SHOW_DEMO && (
            <div className="demo">
              <p>Tài khoản mẫu, bấm để điền sẵn:</p>
              <div className="demo-list">
                {DEMO_ACCOUNTS.map((a) => (
                  <button key={a.username} type="button" className="btn btn-sm" onClick={() => fillDemo(a)}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
