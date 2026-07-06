import { useState, useEffect } from "react";
import { kpiApi, usersApi, targetApi, reportApi } from "../api";
import { Search, ChevronLeft, ChevronRight, Filter, X, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface KpiEntry {
  _id: string;
  date: string;
  user: { _id: string; fullName: string; department: string; position: string };
  ibZalo: number; ibFacebook: number; comment: number; baiDang: number;
  khachRep: number; khachChuDongIB: number; followUp: number;
  baoGia: number; chotDeal: number; doanhThu: number;
  nhuCauKhach?: string;
  taiSaoMatKhach?: string;
  ghiChu?: string;
}

interface Target {
  _id: string;
  type: string;
  targetRef: string;
  month: string;
  targets: Record<string, number>;
  actuals?: Record<string, number>;
}

export default function KpiManagePage() {
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState("");
  const [exporting, setExporting] = useState(false);
  const [limit, setLimit] = useState(20);
  const [targets, setTargets] = useState<Target[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);

  useEffect(() => {
    usersApi.getAll().then((res: any) => {
      setUsers(res.data.data.users);
      setDepartments(res.data.data.departments);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: String(page), limit: String(limit), sortBy, sortOrder };
        if (search) params.search = search;
        if (filterUserId) params.userId = filterUserId;
        if (filterDept) params.department = filterDept;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const res = await kpiApi.getAll(params);
        setEntries(res.data.data.entries);
        setTotal(res.data.data.total);

        // Fetch targets and monthly report for rankings
        const targetRes = await targetApi.getAll();
        setTargets(targetRes.data.data);

        const reportParams: Record<string, string> = { groupBy: "user" };
        if (search) reportParams.search = search;
        if (filterUserId) reportParams.userId = filterUserId;
        if (filterDept) reportParams.department = filterDept;
        if (startDate) reportParams.startDate = startDate;
        if (endDate) reportParams.endDate = endDate;
        if (!startDate && !endDate) {
          reportParams.startDate = "1970-01-01";
          reportParams.endDate = "2099-12-31";
        }
        const repRes = await reportApi.get(reportParams);
        setMonthlyReport(repRes.data.data.report || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [page, limit, search, sortBy, sortOrder, filterUserId, filterDept, startDate, endDate]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleQuickPeriodChange = (period: string) => {
    setQuickPeriod(period);
    const now = new Date();
    const formatD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    switch (period) {
      case "today": {
        const dStr = formatD(now);
        setStartDate(dStr);
        setEndDate(dStr);
        break;
      }
      case "week": {
        const start = new Date(now);
        const day = start.getDay() || 7; // Monday is 1, Sunday is 7
        start.setDate(start.getDate() - day + 1);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        setStartDate(formatD(start));
        setEndDate(formatD(end));
        break;
      }
      case "month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(formatD(start));
        setEndDate(formatD(end));
        break;
      }
      case "year": {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        setStartDate(formatD(start));
        setEndDate(formatD(end));
        break;
      }
      default: {
        setStartDate("");
        setEndDate("");
        break;
      }
    }
    setPage(1);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { page: "1", limit: "100000", sortBy, sortOrder };
      if (search) params.search = search;
      if (filterUserId) params.userId = filterUserId;
      if (filterDept) params.department = filterDept;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await kpiApi.getAll(params);
      const allEntries = res.data.data.entries as KpiEntry[];

      const headers = [
        "Ngày", "Nhân viên", "Phòng ban", "Chức vụ",
        "IB Zalo", "IB FB", "Comment", "Bài đăng",
        "Khách rep", "Follow-up", "Báo giá", "Chốt Deal", "Doanh thu",
        "Nhu cầu khách", "Tại sao mất khách", "Ghi chú"
      ];

      const rows = allEntries.map((e) => [
        new Date(e.date).toLocaleDateString("vi-VN"),
        e.user?.fullName || "",
        e.user?.department || "",
        e.user?.position || "",
        e.ibZalo,
        e.ibFacebook,
        e.comment,
        e.baiDang,
        e.khachRep,
        e.followUp,
        e.baoGia,
        e.chotDeal,
        e.doanhThu,
        e.nhuCauKhach || "",
        e.taiSaoMatKhach || "",
        e.ghiChu || ""
      ]);

      const totalsRow = [
        "Tổng cộng", "", "", "",
        allEntries.reduce((sum, e) => sum + e.ibZalo, 0),
        allEntries.reduce((sum, e) => sum + e.ibFacebook, 0),
        allEntries.reduce((sum, e) => sum + e.comment, 0),
        allEntries.reduce((sum, e) => sum + e.baiDang, 0),
        allEntries.reduce((sum, e) => sum + e.khachRep, 0),
        allEntries.reduce((sum, e) => sum + e.followUp, 0),
        allEntries.reduce((sum, e) => sum + e.baoGia, 0),
        allEntries.reduce((sum, e) => sum + e.chotDeal, 0),
        allEntries.reduce((sum, e) => sum + e.doanhThu, 0),
        "", "", ""
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, totalsRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Danh sách KPI");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });

      const fileName = `danh_sach_kpi_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(new Blob([buf]), fileName);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilterUserId("");
    setFilterDept("");
    setStartDate("");
    setEndDate("");
    setQuickPeriod("");
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

  const getCellStyle = (userId: string, dateStr: string, field: string, dailyActualVal: number) => {
    const entryMonth = dateStr.substring(0, 7); // e.g. "2026-07"
    
    // Find target
    const userTarget = targets.find(t => t.type === "USER" && t.targetRef === userId && t.month === entryMonth);
    const companyTarget = targets.find(t => t.type === "COMPANY" && t.targetRef === "ALL" && t.month === entryMonth);
    const target = userTarget || companyTarget;
    
    if (!target) return "";
    const dailyTargetVal = target.targets[field] || 0;
    if (dailyTargetVal === 0) return "";

    return dailyActualVal < dailyTargetVal ? "text-red-600 font-semibold" : "";
  };

  const calculatePoints = (r: any) => {
    let pts = 0;
    pts += (r.chotDeal || 0) * 200;
    pts += ((r.doanhThu || 0) / 1000000) * 20;
    pts += (r.baoGia || 0) * 50;
    pts += (r.followUp || 0) * 25;
    pts += (r.khachChuDongIB || 0) * 15;
    pts += (r.khachRep || 0) * 10;
    pts += (r.ibZalo || 0) * 0.02;
    pts += (r.ibFacebook || 0) * 0.02;
    pts += (r.comment || 0) * 0.01;
    pts += (r.baiDang || 0) * 0.02;
    return Number(pts.toFixed(2));
  };

  const rankings = monthlyReport.map((r: any) => ({
    userId: r._id.userId,
    fullName: r._id.fullName,
    points: calculatePoints(r),
    details: r
  })).sort((a, b) => b.points - a.points);

  const SortIcon = ({ field }: { field: string }) => (
    <span className="ml-1 text-xs">{sortBy === field ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}</span>
  );

  const totals = entries.reduce((acc, e) => {
    acc.ibZalo += e.ibZalo; acc.ibFacebook += e.ibFacebook; acc.comment += e.comment;
    acc.baiDang += e.baiDang; acc.khachRep += e.khachRep; acc.followUp += e.followUp;
    acc.baoGia += e.baoGia; acc.chotDeal += e.chotDeal; acc.doanhThu += e.doanhThu;
    return acc;
  }, { ibZalo: 0, ibFacebook: 0, comment: 0, baiDang: 0, khachRep: 0, followUp: 0, baoGia: 0, chotDeal: 0, doanhThu: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý KPI</h1>
          <p className="text-sm text-gray-500 mt-1">{total} bản ghi</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={quickPeriod}
            onChange={(e) => handleQuickPeriodChange(e.target.value)}
            className="input-field py-1.5 px-3 text-sm font-medium w-40"
          >
            <option value="">Không lọc</option>
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm nhân viên..."
              className="input-field pl-9 w-64"
            />
          </div>
          <button onClick={() => setShowFilter(!showFilter)} className={`btn-secondary flex items-center gap-2 ${showFilter ? "bg-primary-50 text-primary-600 border-primary-200" : ""}`}>
            <Filter size={16} /> Bộ lọc
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting || total === 0}
            className="btn-primary flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            Xuất Excel
          </button>
          {(filterUserId || filterDept || startDate || endDate || quickPeriod) && (
            <button onClick={clearFilters} className="btn-secondary flex items-center gap-2 text-red-600">
              <X size={16} /> Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilter && (
        <div className="card grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Nhân viên</label>
            <select value={filterUserId} onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }} className="input-field">
              <option value="">Tất cả</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phòng ban</label>
            <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setPage(1); }} className="input-field">
              <option value="">Tất cả</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Từ ngày</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input-field" />
          </div>
          <div>
            <label className="label">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input-field" />
          </div>
        </div>
      )}

      {/* Ranking Board */}
      <div className="card p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          🏆 Bảng xếp hạng KPI
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {rankings.map((item, index) => {
            const isTop3 = index < 3;
            const badges = ["🥇", "🥈", "🥉"];
            return (
              <div
                key={item.userId}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-sm transition-shadow cursor-help shrink-0 min-w-[200px]"
                title={
                  `Chi tiết điểm của ${item.fullName}:\n` +
                  `- Chốt Deal: ${item.details.chotDeal || 0} × 200 = ${((item.details.chotDeal || 0) * 200).toLocaleString("vi-VN")} điểm\n` +
                  `- Doanh thu: ${((item.details.doanhThu || 0) / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}M × 20 = ${(((item.details.doanhThu || 0) / 1000000) * 20).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm\n` +
                  `- Báo giá: ${item.details.baoGia || 0} × 50 = ${((item.details.baoGia || 0) * 50).toLocaleString("vi-VN")} điểm\n` +
                  `- Follow-up: ${item.details.followUp || 0} × 25 = ${((item.details.followUp || 0) * 25).toLocaleString("vi-VN")} điểm\n` +
                  `- Khách chủ động: ${item.details.khachChuDongIB || 0} × 15 = ${((item.details.khachChuDongIB || 0) * 15).toLocaleString("vi-VN")} điểm\n` +
                  `- Khách rep: ${item.details.khachRep || 0} × 10 = ${((item.details.khachRep || 0) * 10).toLocaleString("vi-VN")} điểm\n` +
                  `- IB Zalo: ${item.details.ibZalo || 0} × 0.02 = ${((item.details.ibZalo || 0) * 0.02).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm\n` +
                  `- IB FB: ${item.details.ibFacebook || 0} × 0.02 = ${((item.details.ibFacebook || 0) * 0.02).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm\n` +
                  `- Comment: ${item.details.comment || 0} × 0.01 = ${((item.details.comment || 0) * 0.01).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm\n` +
                  `- Bài đăng: ${item.details.baiDang || 0} × 0.02 = ${((item.details.baiDang || 0) * 0.02).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} điểm`
                }
              >
                <span className="text-lg font-bold text-gray-400 shrink-0">
                  {isTop3 ? badges[index] : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.fullName}</p>
                  <p className="text-xs text-gray-400 truncate">{item.details._id.department || "Nhân viên"}</p>
                  <p className="font-bold text-primary-600 text-xs mt-0.5">{item.points.toLocaleString("vi-VN")} điểm</p>
                </div>
              </div>
            );
          })}
          {rankings.length === 0 && (
            <p className="text-center py-4 text-sm text-gray-400 w-full">Chưa có dữ liệu xếp hạng</p>
          )}
        </div>
      </div>

      {/* Table & Pagination */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-gray-50 z-10 cursor-pointer" onClick={() => handleSort("date")}>Ngày<SortIcon field="date" /></th>
                <th className="px-3 py-3 sticky left-[100px] bg-gray-50 z-10">Nhân viên</th>
                <th className="px-3 py-3 text-center cursor-pointer" onClick={() => handleSort("ibZalo")}>IB Zalo<SortIcon field="ibZalo" /></th>
                <th className="px-3 py-3 text-center cursor-pointer" onClick={() => handleSort("ibFacebook")}>IB FB<SortIcon field="ibFacebook" /></th>
                <th className="px-3 py-3 text-center">Comment</th>
                <th className="px-3 py-3 text-center">Bài đăng</th>
                <th className="px-3 py-3 text-center">K.rep</th>
                <th className="px-3 py-3 text-center">Follow</th>
                <th className="px-3 py-3 text-center">B.giá</th>
                <th className="px-3 py-3 text-center font-semibold cursor-pointer" onClick={() => handleSort("chotDeal")}>Deal<SortIcon field="chotDeal" /></th>
                <th className="px-3 py-3 text-right cursor-pointer" onClick={() => handleSort("doanhThu")}>Doanh thu<SortIcon field="doanhThu" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Không có dữ liệu</td></tr>
              ) : (
                <>
                  {entries.map((e) => (
                    <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 sticky left-0 bg-white font-medium text-gray-900 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5 sticky left-[100px] bg-white">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{e.user.fullName}</p>
                        <p className="text-xs text-gray-400">{e.user.department}</p>
                      </td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "ibZalo", e.ibZalo)}`}>{e.ibZalo}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "ibFacebook", e.ibFacebook)}`}>{e.ibFacebook}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "comment", e.comment)}`}>{e.comment}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "baiDang", e.baiDang)}`}>{e.baiDang}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "khachRep", e.khachRep)}`}>{e.khachRep}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "followUp", e.followUp)}`}>{e.followUp}</td>
                      <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, e.date, "baoGia", e.baoGia)}`}>{e.baoGia}</td>
                      <td className={`px-3 py-2.5 text-center font-semibold ${getCellStyle(e.user._id, e.date, "chotDeal", e.chotDeal) || "text-gray-900"}`}>{e.chotDeal}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${getCellStyle(e.user._id, e.date, "doanhThu", e.doanhThu) || "text-emerald-600"}`}>{fmt(e.doanhThu)}đ</td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <td className="px-3 py-3 sticky left-0 bg-gray-50 text-gray-700" colSpan={2}>Tổng trang này</td>
                    <td className="px-3 py-3 text-center">{totals.ibZalo}</td>
                    <td className="px-3 py-3 text-center">{totals.ibFacebook}</td>
                    <td className="px-3 py-3 text-center">{totals.comment}</td>
                    <td className="px-3 py-3 text-center">{totals.baiDang}</td>
                    <td className="px-3 py-3 text-center">{totals.khachRep}</td>
                    <td className="px-3 py-3 text-center">{totals.followUp}</td>
                    <td className="px-3 py-3 text-center">{totals.baoGia}</td>
                    <td className="px-3 py-3 text-center text-primary-600">{totals.chotDeal}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">{fmt(totals.doanhThu)}đ</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <span>Hiển thị</span>
            <select
              value={limit === 100000 ? "all" : String(limit)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") {
                  setLimit(100000);
                } else {
                  setLimit(Number(val));
                }
                setPage(1);
              }}
              className="input-field py-1 px-2 text-xs w-24 h-8"
            >
              <option value="20">20 dòng</option>
              <option value="50">50 dòng</option>
              <option value="100">100 dòng</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-30"><ChevronLeft size={16} /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${p === page ? "bg-primary-600 text-white" : "hover:bg-gray-100"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary p-2 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
