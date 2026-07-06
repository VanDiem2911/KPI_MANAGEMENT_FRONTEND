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

const getWorkingDaysInRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export default function KpiManagePage() {
  const getLocalTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterUserId, setFilterUserId] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [startDate, setStartDate] = useState(getLocalTodayStr());
  const [endDate, setEndDate] = useState(getLocalTodayStr());
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);
  const [quickPeriod, setQuickPeriod] = useState("today");
  const [exporting, setExporting] = useState(false);
  const [limit, setLimit] = useState(20);
  const [targets, setTargets] = useState<Target[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<{ fullName: string; dateRange: string; entries: KpiEntry[] } | null>(null);

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
        const params: Record<string, string> = { page: "1", limit: "10000", sortBy, sortOrder };
        if (search) params.search = search;
        if (filterUserId) params.userId = filterUserId;
        if (filterDept) params.department = filterDept;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        const res = await kpiApi.getAll(params);
        setEntries(res.data.data.entries);

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
  }, [search, sortBy, sortOrder, filterUserId, filterDept, startDate, endDate]);

  const handleSort = (field: string) => {
    if (field === "date") {
      setSortBy("date");
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      if (sortBy === field) {
        if (sortOrder === "desc") {
          setSortOrder("asc");
        } else {
          // 3rd click: Reset sorting back to date descending
          setSortBy("date");
          setSortOrder("desc");
        }
      } else {
        setSortBy(field);
        setSortOrder("desc");
      }
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
    const todayStr = getLocalTodayStr();
    setStartDate(todayStr);
    setEndDate(todayStr);
    setQuickPeriod("today");
    setPage(1);
  };

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

  const getCellStyle = (userId: string, field: string, totalActualVal: number) => {
    if (!startDate || !endDate) return "";
    const workingDays = getWorkingDaysInRange(startDate, endDate);
    if (workingDays === 0) return "";

    const entryMonth = startDate.substring(0, 7); // e.g. "2026-07"
    
    // Find target
    const userTarget = targets.find(t => t.type === "USER" && t.targetRef === userId && t.month === entryMonth);
    const companyTarget = targets.find(t => t.type === "COMPANY" && t.targetRef === "ALL" && t.month === entryMonth);
    const target = userTarget || companyTarget;
    
    if (!target) return "";
    const dailyTargetVal = target.targets[field] || 0;
    if (dailyTargetVal === 0) return "";

    const periodTargetVal = dailyTargetVal * workingDays;
    return totalActualVal < periodTargetVal ? "text-red-600 font-semibold" : "";
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

  // Group entries by user
  const displayRows = (() => {
    const userMap = new Map();
    entries.forEach((e) => {
      const uId = e.user?._id;
      if (!uId) return;

      if (!userMap.has(uId)) {
        userMap.set(uId, {
          userId: uId,
          user: e.user || { fullName: "Chưa rõ", department: "", position: "" },
          date: e.date,
          ibZalo: 0,
          ibFacebook: 0,
          comment: 0,
          baiDang: 0,
          khachRep: 0,
          khachChuDongIB: 0,
          followUp: 0,
          baoGia: 0,
          chotDeal: 0,
          doanhThu: 0,
          detailEntries: []
        });
      }

      const row = userMap.get(uId);
      row.ibZalo += e.ibZalo || 0;
      row.ibFacebook += e.ibFacebook || 0;
      row.comment += e.comment || 0;
      row.baiDang += e.baiDang || 0;
      row.khachRep += e.khachRep || 0;
      row.khachChuDongIB += e.khachChuDongIB || 0;
      row.followUp += e.followUp || 0;
      row.baoGia += e.baoGia || 0;
      row.chotDeal += e.chotDeal || 0;
      row.doanhThu += e.doanhThu || 0;
      row.detailEntries.push(e);
    });
    return Array.from(userMap.values());
  })();

  // Client-side sorting
  const sortedRows = [...displayRows].sort((a, b) => {
    if (sortBy === "date") {
      return sortOrder === "asc"
        ? a.user.fullName.localeCompare(b.user.fullName)
        : b.user.fullName.localeCompare(a.user.fullName);
    }
    const valA = a[sortBy] as number || 0;
    const valB = b[sortBy] as number || 0;
    return sortOrder === "asc" ? valA - valB : valB - valA;
  });

  // Client-side pagination
  const totalGrouped = sortedRows.length;
  const totalPages = Math.ceil(totalGrouped / limit);
  const paginatedRows = sortedRows.slice((page - 1) * limit, page * limit);

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
          <p className="text-sm text-gray-500 mt-1">{totalGrouped} nhân viên</p>
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
            disabled={exporting || entries.length === 0}
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
      <div className="card p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          🏆 Bảng xếp hạng KPI
        </h3>
        {rankings.length === 0 ? (
          <p className="text-center py-6 text-sm text-gray-400">Chưa có dữ liệu xếp hạng</p>
        ) : (
          <div className="space-y-2">
            {rankings.map((item, index) => {
              const maxPoints = rankings[0]?.points || 1;
              const pct = Math.round((item.points / maxPoints) * 100);
              const top3Styles = [
                { bg: "bg-gradient-to-r from-yellow-50 to-amber-50", border: "border-yellow-200", badge: "🥇", bar: "bg-gradient-to-r from-yellow-400 to-amber-500", rank: "text-yellow-600" },
                { bg: "bg-gradient-to-r from-gray-50 to-slate-50", border: "border-gray-200", badge: "🥈", bar: "bg-gradient-to-r from-gray-400 to-slate-500", rank: "text-gray-500" },
                { bg: "bg-gradient-to-r from-orange-50 to-amber-50", border: "border-orange-200", badge: "🥉", bar: "bg-gradient-to-r from-orange-400 to-amber-600", rank: "text-orange-600" },
              ];
              const style = index < 3 ? top3Styles[index] : null;

              return (
                <div
                  key={item.userId}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-all hover:shadow-sm ${
                    style ? `${style.bg} ${style.border}` : "bg-gray-50 border-gray-100 hover:bg-gray-100"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-9 flex items-center justify-center shrink-0">
                    {style ? (
                      <span className="text-2xl leading-none">{style.badge}</span>
                    ) : (
                      <span className={`text-sm font-bold text-gray-400 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center`}>
                        {index + 1}
                      </span>
                    )}
                  </div>

                  {/* Info + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm leading-tight">{item.fullName}</p>
                        <p className="text-xs text-gray-400">{item.details._id.department || "Nhân viên"}</p>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ml-3 ${style ? style.rank : "text-primary-600"}`}>
                        {item.points.toLocaleString("vi-VN")} điểm
                      </span>
                    </div>
                    <div className="w-full bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${style ? style.bar : "bg-primary-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Table & Pagination */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-gray-50 z-10 cursor-pointer" onClick={() => handleSort("date")}>Thời gian<SortIcon field="date" /></th>
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
              ) : paginatedRows.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Không có dữ liệu</td></tr>
              ) : (
                <>
                  {paginatedRows.map((e) => {
                    const dateRangeText = quickPeriod === "today" ? fmtDate(e.date)
                      : quickPeriod === "week" ? "Tuần này"
                      : quickPeriod === "month" ? "Tháng này"
                      : quickPeriod === "year" ? "Năm nay"
                      : startDate && endDate ? `${fmtDate(startDate)} - ${fmtDate(endDate)}`
                      : "Toàn thời gian";

                    return (
                      <tr key={e.userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 sticky left-0 bg-white font-medium text-gray-900 whitespace-nowrap">
                          {dateRangeText}
                        </td>
                        <td className="px-3 py-2.5 sticky left-[100px] bg-white">
                          <button
                            onClick={() => setSelectedEmployeeDetails({
                              fullName: e.user.fullName,
                              dateRange: dateRangeText,
                              entries: e.detailEntries
                            })}
                            className="text-left hover:text-primary-600 transition-colors group"
                            title="Click để xem chi tiết từng ngày"
                          >
                            <p className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate max-w-[140px]">{e.user.fullName}</p>
                            <p className="text-xs text-gray-400">{e.user.department}</p>
                          </button>
                        </td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "ibZalo", e.ibZalo)}`}>{e.ibZalo}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "ibFacebook", e.ibFacebook)}`}>{e.ibFacebook}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "comment", e.comment)}`}>{e.comment}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "baiDang", e.baiDang)}`}>{e.baiDang}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "khachRep", e.khachRep)}`}>{e.khachRep}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "followUp", e.followUp)}`}>{e.followUp}</td>
                        <td className={`px-3 py-2.5 text-center ${getCellStyle(e.user._id, "baoGia", e.baoGia)}`}>{e.baoGia}</td>
                        <td className={`px-3 py-2.5 text-center font-semibold ${getCellStyle(e.user._id, "chotDeal", e.chotDeal) || "text-gray-900"}`}>{e.chotDeal}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${getCellStyle(e.user._id, "doanhThu", e.doanhThu) || "text-emerald-600"}`}>{fmt(e.doanhThu)}đ</td>
                      </tr>
                    );
                  })}
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
      {totalGrouped > 0 && (
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

      {/* Detail list modal */}
      {selectedEmployeeDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedEmployeeDetails(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-primary-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
              <div>
                <h3 className="text-lg font-bold">Danh sách KPI — {selectedEmployeeDetails.fullName}</h3>
                <p className="text-xs text-primary-100 mt-0.5">{selectedEmployeeDetails.dateRange}</p>
              </div>
              <button onClick={() => setSelectedEmployeeDetails(null)} className="text-white/80 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-3 sticky left-0 bg-gray-50 z-10 text-left">Ngày</th>
                    <th className="px-3 py-3 text-center">IB Zalo</th>
                    <th className="px-3 py-3 text-center">IB FB</th>
                    <th className="px-3 py-3 text-center">Comment</th>
                    <th className="px-3 py-3 text-center">Bài đăng</th>
                    <th className="px-3 py-3 text-center">K.rep</th>
                    <th className="px-3 py-3 text-center">Follow</th>
                    <th className="px-3 py-3 text-center">B.giá</th>
                    <th className="px-3 py-3 text-center">Deal</th>
                    <th className="px-3 py-3 text-right">Doanh thu</th>
                    <th className="px-3 py-3 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployeeDetails.entries.map((e) => (
                    <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-3 py-2.5 text-center">{e.ibZalo}</td>
                      <td className="px-3 py-2.5 text-center">{e.ibFacebook}</td>
                      <td className="px-3 py-2.5 text-center">{e.comment}</td>
                      <td className="px-3 py-2.5 text-center">{e.baiDang}</td>
                      <td className="px-3 py-2.5 text-center">{e.khachRep}</td>
                      <td className="px-3 py-2.5 text-center">{e.followUp}</td>
                      <td className="px-3 py-2.5 text-center">{e.baoGia}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-900">{e.chotDeal}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-600 whitespace-nowrap">{fmt(e.doanhThu)}đ</td>
                      <td className="px-3 py-2.5 text-left text-xs text-gray-500 max-w-[200px] truncate" title={e.ghiChu || ""}>
                        {e.ghiChu || "-"}
                      </td>
                    </tr>
                  ))}
                  {selectedEmployeeDetails.entries.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-8 text-gray-400">Không có dữ liệu chi tiết</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
              <button onClick={() => setSelectedEmployeeDetails(null)} className="px-5 py-2 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
