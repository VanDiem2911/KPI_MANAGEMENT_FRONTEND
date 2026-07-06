import { useState, useEffect } from "react";
import { targetApi, usersApi } from "../api";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";

const KPI_FIELDS = [
  { key: "ibZalo", label: "IB Zalo" }, { key: "ibFacebook", label: "IB Facebook" },
  { key: "comment", label: "Comment" }, { key: "baiDang", label: "Bài đăng" },
  { key: "khachRep", label: "Khách rep" }, { key: "followUp", label: "Follow-up" },
  { key: "baoGia", label: "Báo giá" }, { key: "chotDeal", label: "Chốt Deal" },
  { key: "doanhThu", label: "Doanh thu" },
];

interface Target {
  _id: string;
  type: string;
  targetRef: string;
  month: string;
  targets: Record<string, number>;
  actuals?: Record<string, number>;
  createdBy?: { fullName: string };
}

export default function KpiTargetPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "COMPANY", targetRef: "ALL", month: "", targets: {} as Record<string, number> });

  useEffect(() => {
    Promise.all([
      targetApi.getAll(),
      usersApi.getAll(),
    ]).then(([tRes, uRes]: any) => {
      setTargets(tRes.data.data);
      setUsers(uRes.data.data.users);
    }).finally(() => setLoading(false));
  }, []);

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const handleSave = async () => {
    try {
      const data = { ...form, month: form.month || currentMonth };
      if (editing) {
        const res = await targetApi.update(editing, data);
        setTargets(targets.map((t) => t._id === editing ? res.data.data : t));
      } else {
        const res = await targetApi.create(data);
        setTargets([res.data.data, ...targets]);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ type: "COMPANY", targetRef: "ALL", month: "", targets: {} });
    } catch (err) { console.error(err); }
  };

  const handleEdit = (t: Target) => {
    setForm({ type: t.type, targetRef: t.targetRef, month: t.month, targets: { ...t.targets } });
    setEditing(t._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa target này?")) return;
    await targetApi.delete(id);
    setTargets(targets.filter((t) => t._id !== id));
  };

  const getRefLabel = (t: Target) => {
    if (t.type === "COMPANY") return "Tất cả nhân viên";
    const u = users.find((u) => u._id === t.targetRef);
    return u?.fullName || t.targetRef;
  };





  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KPI Target</h1>
          <p className="text-sm text-gray-500 mt-1">Cấu hình mục tiêu KPI</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => { setShowForm(true); setEditing(null); setForm({ type: "COMPANY", targetRef: "ALL", month: currentMonth, targets: {} }); }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Thêm Target
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-primary-200 border-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{editing ? "Sửa" : "Thêm"} Target</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Loại target</label>
              <select
                value={form.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setForm({
                    ...form,
                    type: newType,
                    targetRef: newType === "COMPANY" ? "ALL" : ""
                  });
                }}
                className="input-field"
              >
                <option value="COMPANY">Tất cả nhân viên</option>
                <option value="USER">Nhân viên cụ thể</option>
              </select>
            </div>
            <div>
              <label className="label">Đối tượng</label>
              <select
                value={form.targetRef}
                onChange={(e) => setForm({ ...form, targetRef: e.target.value })}
                className="input-field"
                disabled={form.type === "COMPANY"}
              >
                {form.type === "COMPANY" ? (
                  <option value="ALL">Tất cả nhân viên</option>
                ) : (
                  <>
                    <option value="">Chọn nhân viên...</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>{u.fullName}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="label">Tháng</label>
              <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {KPI_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label text-xs">{f.label}</label>
                <input
                  type="number"
                  value={form.targets[f.key] || ""}
                  onChange={(e) => setForm({ ...form, targets: { ...form.targets, [f.key]: Number(e.target.value) } })}
                  className="input-field text-sm"
                  placeholder="0"
                  min="0"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} className="btn-primary flex items-center gap-2"><Save size={16} /> Lưu</button>
          </div>
        </div>
      )}

      {/* Target List */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="px-4 py-3">Nhân viên</th>
              <th className="px-4 py-3">Tháng</th>
              {KPI_FIELDS.map((f) => <th key={f.key} className="px-3 py-3 text-center text-xs">{f.label}</th>)}
              <th className="px-4 py-3 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={12} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
            ) : targets.length === 0 ? (
              <tr><td colSpan={12} className="text-center py-12 text-gray-400">Chưa có target</td></tr>
            ) : targets.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{getRefLabel(t)}</td>
                <td className="px-4 py-3">{t.month}</td>
                {KPI_FIELDS.map((f) => {
                  const targetVal = t.targets[f.key] || 0;
                  return (
                    <td key={f.key} className="px-3 py-4 text-center font-medium text-gray-600">
                      {targetVal.toLocaleString("vi-VN")}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => handleEdit(t)} className="text-gray-400 hover:text-blue-600"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(t._id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
