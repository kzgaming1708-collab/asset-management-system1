import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { errorMessage } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";
import { useFeedback } from "../components/Feedback.jsx";
import Icon from "../components/Icon.jsx";
import { STATUS_COLORS, STATUS_LABELS } from "../constants.js";
import { money, shortMoney } from "../utils.js";

function Tip({ active, payload, label, valueFormat }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="tip">
      <strong>{label ?? item.name}</strong>
      {item.name && label ? `${item.name}: ` : ""}
      {valueFormat ? valueFormat(item.value) : item.value}
    </div>
  );
}

function Kpi({ label, value, tone, big, sub }) {
  return (
    <div className="kpi" style={tone ? { "--tone": STATUS_COLORS[tone] } : undefined}>
      <div className="kpi-label">
        {tone && <i className="dot" />}
        {label}
      </div>
      <div className={`kpi-value ${big ? "big" : ""}`}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function Panel({ title, note, wide, children }) {
  return (
    <section className={`panel ${wide ? "wide" : ""}`}>
      <div className="panel-head">
        <h3>{title}</h3>
        {note && <p>{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Dashboard() {
  const { toast } = useFeedback();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setError("");
    api
      .get("/reports/summary/")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get("/reports/export/", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bao-cao-tai-san.csv";
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã tải file bao-cao-tai-san.csv");
    } catch (err) {
      toast.error(`Không xuất được CSV. ${errorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <div className="page-head">
      <div>
        <h1>Báo cáo</h1>
        <p>Tình hình tài sản tính đến hôm nay.</p>
      </div>
      <button className="btn" onClick={exportCsv} disabled={exporting || !data}>
        {exporting ? <span className="spinner" /> : <Icon name="download" size={16} />}
        Xuất CSV
      </button>
    </div>
  );

  if (error) {
    return (
      <>
        {header}
        <div className="panel">
          <EmptyState
            title="Không tải được báo cáo"
            text={error}
            action={
              <button className="btn" onClick={load}>
                Thử lại
              </button>
            }
          />
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {header}
        <div className="muted">Đang tải báo cáo…</div>
      </>
    );
  }

  const { totals, by_status, by_category, by_month } = data;

  if (totals.count === 0) {
    return (
      <>
        {header}
        <div className="panel">
          <EmptyState
            title="Chưa có tài sản nào"
            text="Thêm tài sản đầu tiên ở mục Tài sản, báo cáo sẽ hiện ở đây."
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}

      <div className="kpis">
        <Kpi label="Tổng giá trị mua" value={money(totals.value)} big sub={`${totals.count} tài sản`} />
        <Kpi label={STATUS_LABELS.in_use} value={totals.in_use} tone="in_use" />
        <Kpi label={STATUS_LABELS.in_stock} value={totals.in_stock} tone="in_stock" />
        <Kpi label={STATUS_LABELS.maintenance} value={totals.maintenance} tone="maintenance" />
        <Kpi label={STATUS_LABELS.disposed} value={totals.disposed} tone="disposed" />
      </div>

      <div className="charts">
        <Panel title="Theo trạng thái" note="Số lượng tài sản ở từng trạng thái">
          <div className="donut-wrap">
            <div className="chart-box" style={{ height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={by_status}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  >
                    {by_status.map((s) => (
                      <Cell key={s.status} fill={STATUS_COLORS[s.status] || "var(--muted)"} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tip valueFormat={(v) => `${v} tài sản`} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="donut-center" style={{ inset: "0 0 0 0" }}>
              <strong>{totals.count}</strong>
              <span>tài sản</span>
            </div>
          </div>
          <div className="legend">
            {by_status.map((s) => (
              <span key={s.status} style={{ "--tone": STATUS_COLORS[s.status] }}>
                <i />
                {s.label} ({s.count})
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Theo danh mục" note="Số lượng tài sản trong mỗi danh mục">
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={by_category} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={104}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  content={<Tip valueFormat={(v) => `${v} tài sản`} />}
                />
                <Bar dataKey="count" name="Số lượng" fill="var(--chart-1)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel wide title="Giá trị mua theo tháng" note="Tổng giá mua của tài sản theo tháng mua">
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={by_month} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={shortMoney} axisLine={false} tickLine={false} width={56} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<Tip valueFormat={money} />} />
                <Bar dataKey="value" name="Giá trị" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </>
  );
}
