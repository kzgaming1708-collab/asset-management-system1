export default function Pagination({ page, count, pageSize, onChange }) {
  if (!count) return null;

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="pagination">
      <span className="muted">
        Hiển thị {from}–{to} trong {count}
      </span>
      {totalPages > 1 && (
        <div className="pager">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            Trước
          </button>
          <span className="pager-page">
            {page} / {totalPages}
          </span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
