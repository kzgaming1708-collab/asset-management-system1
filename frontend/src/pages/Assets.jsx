import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage, fieldErrors, formError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useFeedback } from "../components/Feedback.jsx";
import Field from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import Modal from "../components/Modal.jsx";
import Pagination from "../components/Pagination.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { PAGE_SIZE, STATUS_LABELS } from "../constants.js";
import { formatDate, money } from "../utils.js";

const EMPTY_FORM = {
  code: "",
  name: "",
  category: "",
  status: "in_stock",
  purchase_date: "",
  purchase_price: 0,
  location: "",
  assigned_to: "",
  note: "",
};

function toForm(asset) {
  return {
    code: asset.code,
    name: asset.name,
    category: asset.category ?? "",
    status: asset.status,
    purchase_date: asset.purchase_date ?? "",
    purchase_price: asset.purchase_price ?? 0,
    location: asset.location ?? "",
    assigned_to: asset.assigned_to ?? "",
    note: asset.note ?? "",
  };
}

function AssetForm({ initial, categories, users, onSaved, onCancel }) {
  const { toast } = useFeedback();
  const [form, setForm] = useState(initial ? toForm(initial) : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  // Giữ trạng thái và người sử dụng nhất quán với nhau
  const onStatusChange = (e) => {
    const status = e.target.value;
    setForm((f) => ({
      ...f,
      status,
      assigned_to: status === "in_stock" || status === "disposed" ? "" : f.assigned_to,
    }));
  };
  const onAssigneeChange = (e) => {
    const assigned_to = e.target.value;
    setForm((f) => ({
      ...f,
      assigned_to,
      status: assigned_to && (f.status === "in_stock" || f.status === "disposed") ? "in_use" : f.status,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    const payload = {
      ...form,
      category: form.category || null,
      assigned_to: form.assigned_to || null,
      purchase_date: form.purchase_date || null,
      purchase_price: Number(form.purchase_price || 0),
    };
    try {
      if (initial) await api.patch(`/assets/${initial.id}/`, payload);
      else await api.post("/assets/", payload);
      toast.success(initial ? `Đã lưu thay đổi cho ${form.code}` : `Đã thêm tài sản ${form.code}`);
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(formError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid" noValidate>
      {error && (
        <div className="form-alert full" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </div>
      )}

      <Field label="Mã tài sản" required error={errors.code} hint="Duy nhất, ví dụ LT-001">
        <input value={form.code} onChange={set("code")} required />
      </Field>
      <Field label="Tên tài sản" required error={errors.name}>
        <input value={form.name} onChange={set("name")} required />
      </Field>
      <Field label="Danh mục" error={errors.category}>
        <select value={form.category} onChange={set("category")}>
          <option value="">Chưa phân loại</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Trạng thái" error={errors.status}>
        <select value={form.status} onChange={onStatusChange}>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ngày mua" error={errors.purchase_date}>
        <input type="date" value={form.purchase_date} onChange={set("purchase_date")} />
      </Field>
      <Field label="Giá mua (₫)" error={errors.purchase_price}>
        <input type="number" min="0" value={form.purchase_price} onChange={set("purchase_price")} />
      </Field>
      <Field label="Vị trí" error={errors.location}>
        <input value={form.location} onChange={set("location")} />
      </Field>
      <Field
        label="Người sử dụng"
        error={errors.assigned_to}
        hint="Chọn người thì trạng thái tự chuyển sang Đang sử dụng"
      >
        <select value={form.assigned_to} onChange={onAssigneeChange}>
          <option value="">Chưa giao</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ghi chú" className="full" error={errors.note}>
        <textarea value={form.note} onChange={set("note")} />
      </Field>

      <div className="form-actions full">
        <button type="button" className="btn" onClick={onCancel}>
          Huỷ
        </button>
        <button className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner" />}
          Lưu thay đổi
        </button>
      </div>
    </form>
  );
}

function SortHeader({ field, label, sort, onSort, className }) {
  const active = sort === field || sort === `-${field}`;
  const desc = sort === `-${field}`;
  return (
    <th className={className} aria-sort={active ? (desc ? "descending" : "ascending") : "none"}>
      <button className={`sort-btn ${active ? "on" : ""}`} onClick={() => onSort(field)}>
        {label}
        <span className="sort-slot">{active && <Icon name={desc ? "sortDown" : "sortUp"} size={16} />}</span>
      </button>
    </th>
  );
}

const NO_FILTER = { search: "", status: "", category: "" };

export default function Assets() {
  const { canWrite, isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("-created_at");
  const [filters, setFilters] = useState(NO_FILTER);
  const [applied, setApplied] = useState(NO_FILTER);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null); // null | { asset?: object }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  // Danh mục + danh sách người dùng cho các ô chọn
  useEffect(() => {
    api.get("/categories/").then((res) => setCategories(res.data)).catch(() => {});
    if (canWrite) api.get("/users/lookup/").then((res) => setUsers(res.data)).catch(() => {});
  }, [canWrite]);

  // Chờ người dùng gõ xong rồi mới lọc
  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied(filters);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/assets/", {
        params: {
          page,
          page_size: PAGE_SIZE,
          ordering: sort,
          search: applied.search || undefined,
          status: applied.status || undefined,
          category: applied.category || undefined,
        },
      });
      if (id !== requestId.current) return; // đã có yêu cầu mới hơn, bỏ kết quả cũ
      setItems(res.data.results);
      setCount(res.data.count);
    } catch (err) {
      if (id !== requestId.current) return;
      // Trang không còn dữ liệu (vừa xoá hết dòng cuối): lùi về trang trước
      if (err.response?.status === 404 && page > 1) setPage(page - 1);
      else setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, applied, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const onSort = (field) => {
    setSort((current) => (current === field ? `-${field}` : field));
    setPage(1);
  };

  const hasFilter = Boolean(filters.search || filters.status || filters.category);

  const remove = async (asset) => {
    const ok = await confirm({
      title: `Xoá tài sản ${asset.code}?`,
      message: `"${asset.name}" sẽ bị xoá khỏi sổ và không khôi phục được.`,
      confirmLabel: "Xoá tài sản",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/assets/${asset.id}/`);
      toast.success(`Đã xoá tài sản ${asset.code}`);
      load();
    } catch (err) {
      toast.error(`Không xoá được ${asset.code}. ${errorMessage(err)}`);
    }
  };

  const onSaved = () => {
    setModal(null);
    load();
  };

  const colCount = canWrite ? 9 : 8;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tài sản</h1>
          <p>{canWrite ? "Thêm, sửa và theo dõi tài sản của đơn vị." : "Danh sách tài sản của đơn vị."}</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Icon name="plus" size={16} />
            Thêm tài sản
          </button>
        )}
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Tìm theo mã, tên, vị trí hoặc người sử dụng"
            aria-label="Tìm tài sản"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          aria-label="Lọc theo trạng thái"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">Mọi trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Lọc theo danh mục"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">Mọi danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="result-line" aria-live="polite">
        {!loading && !error && (
          <>
            <span>{count} tài sản</span>
            {hasFilter && (
              <button className="link-btn" onClick={() => setFilters(NO_FILTER)}>
                Xoá bộ lọc
              </button>
            )}
          </>
        )}
      </div>

      <div className="table-wrap">
        {error ? (
          <EmptyState
            title="Không tải được danh sách"
            text={error}
            action={
              <button className="btn" onClick={load}>
                Thử lại
              </button>
            }
          />
        ) : (
          <table>
            <thead>
              <tr>
                <SortHeader field="code" label="Mã" sort={sort} onSort={onSort} />
                <SortHeader field="name" label="Tên" sort={sort} onSort={onSort} />
                <th>Danh mục</th>
                <SortHeader field="status" label="Trạng thái" sort={sort} onSort={onSort} />
                <SortHeader field="purchase_date" label="Ngày mua" sort={sort} onSort={onSort} />
                <SortHeader field="purchase_price" label="Giá mua" sort={sort} onSort={onSort} className="num" />
                <th>Vị trí</th>
                <th>Người sử dụng</th>
                {canWrite && (
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && <SkeletonRows rows={PAGE_SIZE} cols={colCount} />}
              {items.map((a) => (
                <tr key={a.id} style={loading ? { opacity: 0.55 } : undefined}>
                  <td>
                    <span className="code-chip">{a.code}</span>
                  </td>
                  <td className="cell-main">{a.name}</td>
                  <td>{a.category_name || <span className="muted">Chưa phân loại</span>}</td>
                  <td>
                    <StatusPill status={a.status} label={a.status_display} />
                  </td>
                  <td>{formatDate(a.purchase_date)}</td>
                  <td className="num">{money(a.purchase_price)}</td>
                  <td>{a.location || "—"}</td>
                  <td>{a.assigned_to_name || <span className="muted">Chưa giao</span>}</td>
                  {canWrite && (
                    <td className="actions-cell">
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          onClick={() => setModal({ asset: a })}
                          aria-label={`Sửa ${a.code}`}
                          title="Sửa"
                        >
                          <Icon name="edit" size={17} />
                        </button>
                        {isAdmin && (
                          <button
                            className="icon-btn danger"
                            onClick={() => remove(a)}
                            aria-label={`Xoá ${a.code}`}
                            title="Xoá"
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!error && !loading && items.length === 0 && (
          <EmptyState
            title={hasFilter ? "Không có tài sản khớp bộ lọc" : "Chưa có tài sản nào"}
            text={
              hasFilter
                ? "Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
                : canWrite
                  ? "Bấm Thêm tài sản để ghi tài sản đầu tiên vào sổ."
                  : "Liên hệ quản lý để thêm tài sản."
            }
            action={
              hasFilter ? (
                <button className="btn" onClick={() => setFilters(NO_FILTER)}>
                  Xoá bộ lọc
                </button>
              ) : null
            }
          />
        )}
      </div>

      {!error && <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={setPage} />}

      {modal && (
        <Modal title={modal.asset ? `Sửa ${modal.asset.code}` : "Thêm tài sản"} onClose={() => setModal(null)}>
          <AssetForm
            initial={modal.asset}
            categories={categories}
            users={users}
            onSaved={onSaved}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
