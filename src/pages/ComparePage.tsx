import { useState, useEffect } from "react";
import { compareApi, usersApi } from "../api";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const KPI_LABELS: Record<string, string> = {
  ibZalo: "IB Zalo", ibFacebook: "IB Facebook", comment: "Comment",
  baiDang: "Bài đăng", khachRep: "Khách rep", followUp: "Follow-up",
  baoGia: "Báo giá", chotDeal: "Chốt Deal", doanhThu: "Doanh thu",
  khachChuDongIB: "KH chủ động",
};

const COMPARE_TYPES = [
  { value: "today", label: "Hôm nay vs Hôm qua" },
  { value: "week", label: "Tuần này vs Tuần trước" },
  { value: "month", label: "Tháng này vs Tháng trước" },
  { value: "quarter", label: "Quý này vs Quý trước" },
  { value: "year", label: "Năm nay vs Năm trước" },
];

interface CompareItem {
  current: number;
  previous: number;
  change: number;
  percent: number;
  direction: string;
}

export default function ComparePage() {
  const [type, setType] = useState("month");
  const [userId, setUserId] = useState("");
  const [comparison, setComparison] = useState<Record<string, CompareItem> | null>(null);
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareMode, setCompareMode] = useState<"period" | "month" | "year">("month");
  const [monthA, setMonthA] = useState("2026-06");
  const [monthB, setMonthB] = useState("2026-05");
  const [yearA, setYearA] = useState("2026");
  const [yearB, setYearB] = useState("2025");

  useEffect(() => {
    usersApi.getAll().then((res: any) => setUsers(res.data.data.users)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (compareMode === "period") {
          params.type = type;
        } else if (compareMode === "month") {
          params.monthA = monthA;
          params.monthB = monthB;
        } else if (compareMode === "year") {
          params.yearA = yearA;
          params.yearB = yearB;
        }
        if (userId) params.userId = userId;
        const res = await compareApi.get(params);
        setComparison(res.data.data.comparison);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [compareMode, type, monthA, monthB, yearA, yearB, userId]);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString("vi-VN");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">So sánh KPI</h1>
        <p className="text-sm text-gray-500 mt-1">So sánh kỳ hiện tại với kỳ trước</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className={`grid grid-cols-1 ${compareMode === "period" ? "md:grid-cols-3" : "md:grid-cols-4"} gap-4`}>
          <div>
            <label className="label">Chế độ so sánh</label>
            <select value={compareMode} onChange={(e) => setCompareMode(e.target.value as any)} className="input-field">
              <option value="month">So sánh tháng với tháng</option>
              <option value="year">So sánh năm với năm</option>
              <option value="period">So sánh theo chu kỳ (Hôm nay, tuần...)</option>
            </select>
          </div>
          {compareMode === "period" && (
            <div>
              <label className="label">Chu kỳ</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
                {COMPARE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          )}
          {compareMode === "month" && (
            <>
              <div>
                <label className="label">Tháng A (So sánh)</label>
                <input type="month" value={monthA} onChange={(e) => setMonthA(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Tháng B (Đối chiếu)</label>
                <input type="month" value={monthB} onChange={(e) => setMonthB(e.target.value)} className="input-field" />
              </div>
            </>
          )}
          {compareMode === "year" && (
            <>
              <div>
                <label className="label">Năm A (So sánh)</label>
                <select value={yearA} onChange={(e) => setYearA(e.target.value)} className="input-field">
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
              <div>
                <label className="label">Năm B (Đối chiếu)</label>
                <select value={yearB} onChange={(e) => setYearB(e.target.value)} className="input-field">
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="label">Nhân viên</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input-field">
              <option value="">Tất cả</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.fullName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" /></div>
      ) : comparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Object.entries(comparison).map(([key, item]) => {
            const isUp = item.direction === "up";
            const isDown = item.direction === "down";
            return (
              <div key={key} className={`card border-2 transition-all hover:scale-[1.03] ${
                isUp ? "border-emerald-200 bg-emerald-50/50" : isDown ? "border-red-200 bg-red-50/50" : "border-gray-200"
              }`}>
                <p className="text-sm font-medium text-gray-600 mb-3">{KPI_LABELS[key] || key}</p>
                
                <div className="flex items-end gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Hiện tại</p>
                    <p className="text-2xl font-bold text-gray-900">{fmt(item.current)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Trước đó</p>
                    <p className="text-lg text-gray-500">{fmt(item.previous)}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isUp ? "bg-emerald-100 text-emerald-700" : isDown ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {isUp ? <TrendingUp size={18} /> : isDown ? <TrendingDown size={18} /> : <Minus size={18} />}
                  <span className="font-bold text-lg">
                    {isUp ? "▲" : isDown ? "▼" : "="} {Math.abs(item.percent)}%
                  </span>
                  <span className="text-sm ml-auto">
                    {item.change > 0 ? "+" : ""}{fmt(item.change)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">Không có dữ liệu</p>
      )}
    </div>
  );
}
