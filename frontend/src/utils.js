export function money(value) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("vi-VN").format(number) + " ₫";
}

export function shortMoney(value) {
  const number = Number(value || 0);
  if (number >= 1_000_000_000) return (number / 1_000_000_000).toFixed(1) + " tỷ";
  if (number >= 1_000_000) return (number / 1_000_000).toFixed(0) + " tr";
  return new Intl.NumberFormat("vi-VN").format(number);
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN");
}

// "Nguyễn Văn Quản Lý" -> "NL"
export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
