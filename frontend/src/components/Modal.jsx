import { useEffect, useId, useRef } from "react";
import Icon from "./Icon.jsx";

// Hộp thoại: đóng bằng Esc hoặc bấm ra ngoài, khoá cuộn trang nền,
// tự đưa con trỏ vào ô đầu tiên và trả lại vị trí cũ khi đóng.
export default function Modal({ title, onClose, children, size = "md" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const target =
      node.querySelector("[data-autofocus]") ||
      node.querySelector("input:not([disabled]):not([type='checkbox']), select, textarea") ||
      node;
    target.focus();

    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
