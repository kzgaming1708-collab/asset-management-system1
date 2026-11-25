import { useEffect, useRef, useState } from "react";
import api from "../api.js";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Không tải được script Google")));
  });
}

// Nút "Đăng nhập bằng Google". Tự ẩn nếu backend chưa cấu hình GOOGLE_CLIENT_ID.
// onCredential(idToken) được gọi khi người dùng chọn xong tài khoản Google.
export default function GoogleButton({ onCredential }) {
  const slot = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const [state, setState] = useState("loading"); // loading | off | on | failed

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const { data } = await api.get("/auth/config/");
        if (cancelled) return;
        if (!data.google_client_id) {
          setState("off");
          return;
        }
        await loadGoogleScript();
        if (cancelled) return;

        window.google.accounts.id.initialize({
          client_id: data.google_client_id,
          callback: (response) => handler.current(response.credential),
        });
        setState("on");
      } catch {
        if (!cancelled) setState("failed");
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  // Vẽ nút sau khi khung chứa đã hiện ra (cần biết chiều rộng)
  useEffect(() => {
    if (state !== "on" || !slot.current) return;
    const width = Math.min(400, Math.max(200, slot.current.offsetWidth));
    window.google.accounts.id.renderButton(slot.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      locale: "vi",
      width,
    });
  }, [state]);

  if (state === "loading" || state === "off") return null;

  return (
    <>
      <div className="or">
        <span>hoặc</span>
      </div>
      {state === "failed" ? (
        <p className="muted google-failed">Không tải được đăng nhập Google. Kiểm tra kết nối mạng rồi tải lại trang.</p>
      ) : (
        <div className="google-slot" ref={slot} />
      )}
    </>
  );
}
