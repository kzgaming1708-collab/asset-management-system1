// Một ô nhập có nhãn, gợi ý và thông báo lỗi ngay bên dưới.
export default function Field({ label, error, hint, required, className = "", children }) {
  return (
    <label className={`field ${error ? "has-error" : ""} ${className}`}>
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}
