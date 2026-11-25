// Logo: một chiếc thẻ tài sản màu vàng có lỗ đục.
export default function BrandMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
        fill="var(--tag-yellow)"
        stroke="var(--ink)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.3" />
    </svg>
  );
}
