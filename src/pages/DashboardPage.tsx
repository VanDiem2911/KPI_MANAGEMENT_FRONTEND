import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dashboardApi, compareApi } from "../api";
import {
  Users, DollarSign, Handshake, MessageSquare,
  TrendingUp, TrendingDown, Minus, Target, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface CompareItem {
  current: number;
  previous: number;
  change: number;
  percent: number;
  direction: string;
}

const CHART_COLORS = [
  "#4d08efff", // IB Zalo (Blue)
  "#1877f2", // IB Facebook (Facebook Blue)
  "#f59e0b", // Comment (Amber)
  "#a855f7", // Bài đăng (Purple)
  "#ec4899", // Follow-up (Pink)
  "#10b981", // Chốt Deal (Emerald)
  "#f97316", // KH chủ động (Orange)
  "#14b8a6", // Báo giá (Teal)
  "#6366f1", // Indigo
  "#64748b"  // Slate
];

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString("vi-VN");
}

function StatCard({ title, value, icon: Icon, compare, color = "primary" }: {
  title: string; value: number | string; icon: React.ElementType;
  compare?: CompareItem; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary-50 text-primary-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="card p-4 group hover:scale-[1.01] transition-transform duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
          {compare && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
              compare.direction === "up" ? "text-emerald-600" : compare.direction === "down" ? "text-red-600" : "text-gray-500"
            }`}>
              {compare.direction === "up" ? <TrendingUp size={13} /> : compare.direction === "down" ? <TrendingDown size={13} /> : <Minus size={13} />}
              <span>{compare.direction === "up" ? "▲" : compare.direction === "down" ? "▼" : "="} {Math.abs(compare.percent)}%</span>
              <span className="text-gray-400 text-[10px]">({compare.direction === "up" ? "+" : ""}{formatNumber(compare.change)})</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-xl ${colorMap[color] || colorMap.primary}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compareData, setCompareData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, compRes] = await Promise.all([
          dashboardApi.get({ month: selectedMonth }),
          compareApi.get({ type: "month", month: selectedMonth }),
        ]);
        setData(dashRes.data.data);
        setCompareData(compRes.data.data?.comparison);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Không có dữ liệu</p>;

  return isAdmin ? (
    <AdminDashboard data={data} compare={compareData} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
  ) : (
    <UserDashboard data={data} compare={compareData} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AdminDashboard({ data, compare, selectedMonth, setSelectedMonth }: { data: any; compare: any; selectedMonth: string; setSelectedMonth: (m: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Tổng quan KPI toàn hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chọn tháng:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field py-1.5 px-3 text-sm font-medium w-40 h-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Tổng nhân viên" value={data.totalUsers} icon={Users} color="blue" />
        <StatCard title="Doanh thu tháng" value={data.monthKpi?.doanhThu || 0} icon={DollarSign} compare={compare?.doanhThu} color="green" />
        <StatCard title="Chốt Deal tháng" value={data.monthKpi?.chotDeal || 0} icon={Handshake} compare={compare?.chotDeal} color="orange" />
        <StatCard title="Tổng IB tháng" value={(data.monthKpi?.ibZalo || 0) + (data.monthKpi?.ibFacebook || 0)} icon={MessageSquare} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Doanh thu 30 ngày</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStart" />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatNumber(v)} />
              <Tooltip formatter={(v: any) => formatNumber(Number(v))} />
              <Area type="monotone" dataKey="doanhThu" stroke="#6366f1" fill="#e0e7ff" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">IB & Deal 30 ngày</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStart" />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="ibZalo" name="IB Zalo" fill="#4d08ef" radius={[3, 3, 0, 0]} />
              <Bar dataKey="ibFacebook" name="IB Facebook" fill="#1877f2" radius={[3, 3, 0, 0]} />
              <Bar dataKey="chotDeal" name="Chốt Deal" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Employees & KPI Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Top nhân viên (Doanh thu tháng)</h3>
          <div className="space-y-2">
            {data.topEmployees?.map((emp: { _id: string; user: { fullName: string; department: string }; totalDoanhThu: number; totalChotDeal: number }, i: number) => (
              <div key={emp._id} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-gray-300"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{emp.user.fullName}</p>
                  <p className="text-[10px] text-gray-500">{emp.user.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-primary-600">{formatNumber(emp.totalDoanhThu)}đ</p>
                  <p className="text-[10px] text-gray-500">{emp.totalChotDeal} deals</p>
                </div>
              </div>
            ))}
            {(!data.topEmployees || data.topEmployees.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Phân bổ KPI tháng</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: "IB Zalo", value: data.monthKpi?.ibZalo || 0 },
                  { name: "IB Facebook", value: data.monthKpi?.ibFacebook || 0 },
                  { name: "Comment", value: data.monthKpi?.comment || 0 },
                  { name: "Bài đăng", value: data.monthKpi?.baiDang || 0 },
                  { name: "Follow-up", value: data.monthKpi?.followUp || 0 },
                  { name: "Chốt Deal", value: data.monthKpi?.chotDeal || 0 },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {CHART_COLORS.map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UserDashboard({ data, compare, selectedMonth, setSelectedMonth }: { data: any; compare: any; selectedMonth: string; setSelectedMonth: (m: string) => void }) {
  const kpiLabels: Record<string, string> = {
    ibZalo: "IB Zalo", ibFacebook: "IB Facebook", comment: "Comment",
    baiDang: "Bài đăng", khachRep: "Khách rep", followUp: "Follow-up",
    baoGia: "Báo giá", chotDeal: "Chốt Deal", doanhThu: "Doanh thu",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">KPI cá nhân của bạn</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Chọn tháng:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field py-1.5 px-3 text-sm font-medium w-40 h-10"
          />
        </div>
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="KPI hôm nay" value={data.todayKpi?.chotDeal || 0} icon={Calendar} compare={compare?.chotDeal} color="primary" />
        <StatCard title="Doanh thu tuần" value={data.weekKpi?.doanhThu || 0} icon={DollarSign} color="green" />
        <StatCard title="Doanh thu tháng" value={data.monthKpi?.doanhThu || 0} icon={DollarSign} compare={compare?.doanhThu} color="blue" />
        <StatCard title="Chốt Deal tháng" value={data.monthKpi?.chotDeal || 0} icon={Target} color="orange" />
      </div>

      {/* KPI Progress */}
      {data.target && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tiến độ KPI tháng {selectedMonth.split("-")[1]}/{selectedMonth.split("-")[0]}</h3>
          <div className="space-y-4">
            {Object.entries(kpiLabels).map(([key, label]) => {
              const dailyTarget = data.target?.targets?.[key] || 0;
              if (dailyTarget === 0) return null;
              
              const [yr, mn] = selectedMonth.split("-");
              const daysInMonth = new Date(parseInt(yr), parseInt(mn), 0).getDate();
              const target = dailyTarget * daysInMonth;
              const actual = data.monthKpi?.[key] || 0;
              const percent = Math.round((actual / target) * 100);
              const isAchieved = actual >= target;
              
              const colorMap: Record<string, string> = {
                doanhThu: "bg-emerald-500",
                chotDeal: "bg-blue-500",
                ibZalo: "bg-primary-500",
                ibFacebook: "bg-orange-500",
              };
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {key === "doanhThu" ? `${actual.toLocaleString("vi-VN")}đ` : actual} / {key === "doanhThu" ? `${target.toLocaleString("vi-VN")}đ` : target} ({percent}%)
                      </span>
                      {isAchieved ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Đạt KPI</span>
                      ) : (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold">Chưa đủ KPI</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${colorMap[key] || "bg-primary-500"}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Biểu đồ KPI 30 ngày</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} interval="preserveStart" />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
             <Line type="monotone" dataKey="chotDeal" name="Chốt Deal" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="baoGia" name="Báo giá" stroke="#14b8a6" strokeWidth={1.5} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="followUp" name="Follow-up" stroke="#ec4899" strokeWidth={1.5} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KPI Comparison */}
      {compare && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">So sánh với tháng trước</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(compare).map(([key, item]) => {
              const c = item as CompareItem;
              return (
                <div key={key} className="p-2.5 rounded-xl bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 mb-0.5">{kpiLabels[key] || key}</p>
                  <p className="text-sm font-bold text-gray-900">{formatNumber(c.current)}</p>
                  <p className={`text-[11px] font-semibold ${
                    c.direction === "up" ? "text-emerald-600" : c.direction === "down" ? "text-red-600" : "text-gray-500"
                  }`}>
                    {c.direction === "up" ? "▲" : c.direction === "down" ? "▼" : "="} {Math.abs(c.percent)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
