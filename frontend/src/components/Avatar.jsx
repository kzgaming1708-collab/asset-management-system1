import { initials } from "../utils.js";

export default function Avatar({ name, size = 28 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
