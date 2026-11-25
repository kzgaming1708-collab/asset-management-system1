import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import Modal from "./Modal.jsx";

// Thông báo (toast) và hộp xác nhận dùng chung cho toàn app.
//   const { toast, confirm } = useFeedback();
//   toast.success("Đã lưu thay đổi");
//   if (await confirm({ title: "Xoá tài sản?", tone: "danger", confirmLabel: "Xoá" })) { ... }
const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setToasts((list) => [...list, { id, type, message }]);
      setTimeout(() => dismiss(id), type === "error" ? 6500 : 3500);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    []
  );

  const finish = (result) => {
    dialog.resolve(result);
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type === "error" ? "is-error" : ""}`}
            role={t.type === "error" ? "alert" : "status"}
          >
            <Icon name={t.type === "error" ? "alert" : "check"} className="lead" size={18} />
            <p>{t.message}</p>
            <button className="icon-btn icon-btn-sm" onClick={() => dismiss(t.id)} aria-label="Đóng thông báo">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>

      {dialog && (
        <Modal title={dialog.title} size="sm" onClose={() => finish(false)}>
          {dialog.message && <p className="dialog-text">{dialog.message}</p>}
          <div className="form-actions">
            <button className="btn" data-autofocus onClick={() => finish(false)}>
              Huỷ
            </button>
            <button
              className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`}
              onClick={() => finish(true)}
            >
              {dialog.confirmLabel || "Xác nhận"}
            </button>
          </div>
        </Modal>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
