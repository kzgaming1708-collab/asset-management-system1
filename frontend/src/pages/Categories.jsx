import { useCallback, useEffect, useState } from "react";
import api, { errorMessage, fieldErrors, formError } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useFeedback } from "../components/Feedback.jsx";
import Field from "../components/Field.jsx";
import Icon from "../components/Icon.jsx";
import Modal from "../components/Modal.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";

function CategoryForm({ initial, onSaved, onCancel }) {
  const { toast } = useFeedback();
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrors({});
    try {
      if (initial) await api.patch(`/categories/${initial.id}/`, form);
      else await api.post("/categories/", form);
      toast.success(initial ? "Đã lưu danh mục" : `Đã thêm danh mục ${form.name}`);
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(formError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-grid single" noValidate>
      {error && (
        <div className="form-alert" role="alert">
          <Icon name="alert" size={16} />
          <span>{error}</span>
        </div>
      )}
      <Field label="Tên danh mục" required error={errors.name}>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </Field>
      <Field label="Mô tả" error={errors.description}>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="form-actions">
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

export default function Categories() {
  const { canWrite, isAdmin } = useAuth();
  const { toast, confirm } = useFeedback();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/categories/");
      setItems(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (category) => {
    const ok = await confirm({
      title: `Xoá danh mục ${category.name}?`,
      message:
        category.asset_count > 0
          ? `${category.asset_count} tài sản đang thuộc danh mục này sẽ chuyển thành Chưa phân loại.`
          : "Danh mục chưa có tài sản nào.",
      confirmLabel: "Xoá danh mục",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/categories/${category.id}/`);
      toast.success(`Đã xoá danh mục ${category.name}`);
      load();
    } catch (err) {
      toast.error(`Không xoá được ${category.name}. ${errorMessage(err)}`);
    }
  };

  const onSaved = () => {
    setModal(null);
    load();
  };

  const addButton = (
    <button className="btn btn-primary" onClick={() => setModal({})}>
      <Icon name="plus" size={16} />
      Thêm danh mục
    </button>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Danh mục</h1>
          <p>Nhóm tài sản theo loại để lọc và báo cáo dễ hơn.</p>
        </div>
        {canWrite && addButton}
      </div>

      <div className="table-wrap">
        {error ? (
          <EmptyState
            title="Không tải được danh mục"
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
                <th>Tên</th>
                <th>Mô tả</th>
                <th className="num">Số tài sản</th>
                {canWrite && (
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonRows rows={5} cols={canWrite ? 4 : 3} />}
              {!loading &&
                items.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-main">{c.name}</td>
                    <td>{c.description || <span className="muted">—</span>}</td>
                    <td className="num">{c.asset_count}</td>
                    {canWrite && (
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            onClick={() => setModal({ category: c })}
                            aria-label={`Sửa ${c.name}`}
                            title="Sửa"
                          >
                            <Icon name="edit" size={17} />
                          </button>
                          {isAdmin && (
                            <button
                              className="icon-btn danger"
                              onClick={() => remove(c)}
                              aria-label={`Xoá ${c.name}`}
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
            title="Chưa có danh mục nào"
            text={canWrite ? "Tạo danh mục đầu tiên, ví dụ Laptop hay Nội thất." : "Liên hệ quản lý để thêm danh mục."}
            action={canWrite ? addButton : null}
          />
        )}
      </div>

      {modal && (
        <Modal title={modal.category ? `Sửa ${modal.category.name}` : "Thêm danh mục"} size="sm" onClose={() => setModal(null)}>
          <CategoryForm initial={modal.category} onSaved={onSaved} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </>
  );
}
