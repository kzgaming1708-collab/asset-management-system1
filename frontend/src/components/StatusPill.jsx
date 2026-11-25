export default function StatusPill({ status, label }) {
  return (
    <span className={`status s-${status}`}>
      <i className="dot" />
      {label}
    </span>
  );
}
