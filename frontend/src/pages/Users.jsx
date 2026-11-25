import { useCallback, useEffect, useRef, useState } from "react";
import api, { errorMessage, fieldErrors, formError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useFeedback } from "../components/Feedback.jsx";
import Field from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import Modal from "../components/Modal.jsx";
import Pagination from "../components/Pagination.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";
import { PAGE_SIZE, ROLE_LABELS } from "../constants.js";

function UserForm({ initial, isSelf, onSaved, onCancel }) {
  const { toast } = useFeedback();
  const editing = Boolean(initial);
  const [form, setForm] = useState({
    username: initial?.username ?? "",
    first_name: initial?.first_name ?? "",
    last_name: initial?.last_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    department: initial?.department ?? "",
    role: initial?.role ?? "viewer",
    is_active: initial?.is_active ?? true,
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    const payload = { ...form };
    if (!payload.password) delete payload.password; // để trống = giữ nguyên mật khẩu
    if (editing) delete payload.username;
    try {
      if (editing) await api.patch(`/users/${initial.id}/`, payload);
      else await api.post("/users/", payload);
      toast.success(editing ? `Đã lưu người dùng ${initial.username}` : `Đã thêm người dùng ${form.username}`);
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

      <Field label="Tên đăng nhập" required={!editing} error={errors.username}>
        <input value={form.username} onChange={set("username")} disabled={editing} required />
      </Field>
      <Field
        label={editing ? "Mật khẩu mới" : "Mật khẩu"}
        required={!editing}
        error={errors.password}
        hint={editing ? "Để trống nếu giữ nguyên" : "Ít nhất 8 ký tự, không toàn số"}
      >
        <input
          type="password"
          value={form.password}
          onChange={set("password")}
          required={!editing}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Họ đệm" error={errors.first_name}>
        <input value={form.first_name} onChange={set("first_name")} />
      </Field>
      <Field label="Tên" error={errors.last_name}>
        <input value={form.last_name} onChange={set("last_name")} />
      </Field>
      <Field label="Email" error={errors.email}>
        <input type="email" value={form.email} onChange={set("email")} />
      </Field>
      <Field label="Số điện thoại" error={errors.phone}>
        <input value={form.phone} onChange={set("phone")} />
      </Field>
      <Field label="Phòng ban" error={errors.department}>
        <input value={form.department} onChange={set("department")} />
      </Field>
      <Field
        label="Vai trò"
        error={errors.role}
        hint={isSelf ? "Bạn không thể tự hạ quyền của chính mình" : undefined}
      >
        <select value={form.role} onChange={set("role")} disabled={isSelf}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <label className="check full">
        <input
          type="checkbox"
          checked={form.is_active}
          disabled={isSelf}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
        />
        Cho phép đăng nhập
      </label>

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

export default function Users() {
  const { user: me } = useAuth();
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setApplied(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/users/", {
        params: { page, page_size: PAGE_SIZE, search: applied || undefined },
      });
      if (id !== requestId.current) return;
      setItems(res.data.results);
      setCount(res.data.count);
    } catch (err) {
      if (id !== requestId.current) return;
      if (err.response?.status === 404 && page > 1) setPage(page - 1);
      else setError(errorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (u) => {
    const ok = await confirm({
      title: `Xoá người dùng ${u.username}?`,
      message: "Tài sản đang giao cho người này sẽ chuyển về Chưa giao. Nếu chỉ muốn chặn đăng nhập, hãy tắt Cho phép đăng nhập thay vì xoá.",
      confirmLabel: "Xoá người dùng",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/users/${u.id}/`);
      toast.success(`Đã xoá người dùng ${u.username}`);
      load();
    } catch (err) {
      toast.error(`Không xoá được ${u.username}. ${errorMessage(err)}`);
    }
  };

  const onSaved = () => {
    setModal(null);
    load();
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Người dùng</h1>
          <p>Tạo tài khoản và phân vai trò cho từng người.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>
          <Icon name="plus" size={16} />
          Thêm người dùng
        </button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={16} />
          <input
            type="search"
            placeholder="Tìm theo tên đăng nhập, họ tên hoặc email"
            aria-label="Tìm người dùng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
                <th>Người dùng</th>
                <th>Email</th>
                <th>Phòng ban</th>
                <th>Vai trò</th>
                <th>Đăng nhập</th>
                <th>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && <SkeletonRows rows={5} cols={6} />}
              {items.map((u) => (
                <tr key={u.id} style={loading ? { opacity: 0.55 } : undefined}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={u.full_name} size={32} />
                      <div>
                        <div className="cell-main">
                          {u.full_name}
                          {u.id === me.id && <span className="self-tag">Bạn</span>}
                        </div>
                        <div className="cell-sub">{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>{u.email || <span className="muted">—</span>}</td>
                  <td>{u.department || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`role-tag ${u.role}`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td>{u.is_active ? "Được phép" : <span className="muted">Đã khoá</span>}</td>
                  <td className="actions-cell">
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        onClick={() => setModal({ user: u })}
                        aria-label={`Sửa ${u.username}`}
                        title="Sửa"
                      >
                        <Icon name="edit" size={17} />
                      </button>
                      {u.id !== me.id && (
                        <button
                          className="icon-btn danger"
                          onClick={() => remove(u)}
                          aria-label={`Xoá ${u.username}`}
                          title="Xoá"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!error && !loading && items.length === 0 && (
          <EmptyState
            title={applied ? "Không có người dùng khớp" : "Chưa có người dùng nào"}
            text={applied ? "Thử từ khoá khác." : "Bấm Thêm người dùng để tạo tài khoản đầu tiên."}
          />
        )}
      </div>

      <Pagination page={page} count={count} pageSize={PAGE_SIZE} onChange={setPage} />

      {modal && (
        <Modal title={modal.user ? `Sửa ${modal.user.username}` : "Thêm người dùng"} onClose={() => setModal(null)}>
          <UserForm
            initial={modal.user}
            isSelf={modal.user?.id === me.id}
            onSaved={onSaved}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </>
  );
}
