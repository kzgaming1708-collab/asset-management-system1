// Các dòng giả hiện trong lúc bảng đang tải dữ liệu.
export function SkeletonRows({ rows = 6, cols = 6 }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={r} aria-hidden="true">
      {Array.from({ length: cols }, (_, c) => (
        <td key={c}>
          <span className="skeleton" style={{ width: `${50 + ((r + c * 3) * 17) % 42}%` }} />
        </td>
      ))}
    </tr>
  ));
}
