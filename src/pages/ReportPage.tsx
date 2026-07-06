import { useState, useEffect } from "react";
import { reportApi, usersApi } from "../api";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { FileSpreadsheet, FileText, FileDown, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { arialBase64 } from "../assets/arialBase64";

const KPI_LABELS: Record<string, string> = {
  ibZalo: "IB Zalo", ibFacebook: "IB Facebook", comment: "Comment",
  baiDang: "Bài đăng", khachRep: "Khách rep", followUp: "Follow-up",
  baoGia: "Báo giá", chotDeal: "Chốt Deal", doanhThu: "Doanh thu",
  khachChuDongIB: "KH chủ động",
};

const PERIODS = [
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom_month", label: "Chọn tháng cụ thể" },
];

export default function ReportPage() {
  const [period, setPeriod] = useState("month");
  const [userId, setUserId] = useState("");
  const [department, setDepartment] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [report, setReport] = useState<any>(null);
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("2026-06");
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    usersApi.getAll().then((res: any) => {
      setUsers(res.data.data.users);
      setDepartments(res.data.data.departments);
    }).catch(() => {});
  }, []);

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    if (val === "custom_month") {
      updateDatesForMonth(selectedMonth);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const updateDatesForMonth = (monthStr: string) => {
    if (!monthStr) return;
    const [year, month] = monthStr.split("-");
    const firstDay = `${year}-${month}-01`;
    const lastDayNum = new Date(parseInt(year), parseInt(month), 0).getDate();
    const lastDay = `${year}-${month}-${String(lastDayNum).padStart(2, "0")}`;
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    updateDatesForMonth(val);
  };

  const getParams = (): Record<string, string> => {
    const params: Record<string, string> = { period, groupBy };
    if (userId) params.userId = userId;
    if (department) params.department = department;
    if (startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
    return params;
  };

  const getFriendlyPeriod = () => {
    let label = "";
    if (period === "custom_month") {
      const [year, month] = selectedMonth.split("-");
      label = `Tháng ${month}/${year}`;
    } else {
      const match = PERIODS.find((p) => p.value === period);
      label = match ? match.label : period;
    }
    if (startDate && endDate) {
      const formatD = (dStr: string) => dStr.split("-").reverse().join("/");
      label += ` (${formatD(startDate)} - ${formatD(endDate)})`;
    }
    return label;
  };

  const handleExportCSV = async () => {
    setExporting("csv");
    try {
      const res = await reportApi.export({ ...getParams(), format: "csv" });
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      saveAs(blob, `kpi_report_${period}.csv`);
    } catch (err) { console.error(err); }
    finally { setExporting(""); }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      const res = await reportApi.export({ ...getParams(), format: "json" });
      const { headers, rows } = res.data.data;
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "KPI Report");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      saveAs(new Blob([buf]), `kpi_report_${period}.xlsx`);
    } catch (err) { console.error(err); }
    finally { setExporting(""); }
  };

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const res = await reportApi.export({ ...getParams(), format: "json" });
      const { headers, rows } = res.data.data;
      const doc = new jsPDF({ orientation: "landscape" });
      
      // Register Arial font for both normal and bold to support Vietnamese accents in PDF
      doc.addFileToVFS("Arial.ttf", arialBase64);
      doc.addFont("Arial.ttf", "Arial", "normal");
      doc.addFont("Arial.ttf", "Arial", "bold");
      doc.setFont("Arial");

      doc.setFontSize(16);
      doc.text("Báo cáo KPI - DUDI Software", 14, 15);
      doc.setFontSize(10);
      doc.text(`Kỳ báo cáo: ${getFriendlyPeriod()}`, 14, 22);

      // Normalize strings to NFC to ensure proper Vietnamese accent mapping
      const cleanHeaders = headers.map((h: string) => h.normalize("NFC"));
      const cleanRows = rows.map((r: any[]) => r.map((c) => typeof c === "string" ? c.normalize("NFC") : c));

      autoTable(doc, {
        head: [cleanHeaders],
        body: cleanRows,
        startY: 28,
        styles: { font: "Arial", fontSize: 7, cellPadding: 2 },
        headStyles: { font: "Arial", fontStyle: "bold", fillColor: [220, 38, 38] },
      });
      doc.save(`kpi_report_${period}.pdf`);
    } catch (err) { console.error(err); }
    finally { setExporting(""); }
  };

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { period, groupBy };
        if (userId) params.userId = userId;
        if (department) params.department = department;
        if (startDate && endDate) { params.startDate = startDate; params.endDate = endDate; }
        const res = await reportApi.get(params);
        setReport(res.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [period, userId, department, groupBy, startDate, endDate]);

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const chartData = report?.report?.map((r: Record<string, unknown>) => ({
    ...r,
    name: typeof r._id === "string" ? r._id.slice(5) : r._id && typeof r._id === "object" ? (r._id as Record<string, string>).fullName || `W${(r._id as Record<string, number>).week}` : "",
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo cáo KPI</h1>
          <p className="text-sm text-gray-500 mt-1">Phân tích dữ liệu KPI</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {exporting === "csv" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            Xuất CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {exporting === "excel" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            Xuất Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            Xuất PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div>
            <label className="label">Khoảng thời gian</label>
            <select value={period} onChange={(e) => handlePeriodChange(e.target.value)} className="input-field">
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {period === "custom_month" && (
            <div>
              <label className="label">Chọn tháng</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="input-field"
              />
            </div>
          )}
          <div>
            <label className="label">Nhóm theo</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="input-field">
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="user">Nhân viên</option>
            </select>
          </div>
          <div>
            <label className="label">Nhân viên</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input-field">
              <option value="">Tất cả</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phòng ban</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field">
              <option value="">Tất cả</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Từ ngày</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label">Đến ngày</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-600" /></div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {["ibZalo", "ibFacebook", "chotDeal", "doanhThu", "followUp"].map((key) => (
              <div key={key} className="card text-center">
                <p className="text-xs text-gray-500 mb-1">{KPI_LABELS[key]}</p>
                <p className="text-xl font-bold text-gray-900">{fmt(report.totals?.[key] || 0)}</p>
                <p className="text-xs text-gray-400">TB: {fmt(report.averages?.[key] || 0)}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-base font-semibold mb-4">Doanh thu & Deal</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStart" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="chotDeal" name="Chốt Deal" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="baoGia" name="Báo giá" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="text-base font-semibold mb-4">IB & Tương tác</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval="preserveStart" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ibZalo" name="IB Zalo" stroke="#dc2626" strokeWidth={2} />
                  <Line type="monotone" dataKey="ibFacebook" name="IB Facebook" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="comment" name="Comment" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 py-3">Nhóm</th>
                    {Object.keys(KPI_LABELS).map((k) => <th key={k} className="px-3 py-3 text-center text-xs">{KPI_LABELS[k]}</th>)}
                    <th className="px-3 py-3 text-center">Entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.report?.map((row: Record<string, unknown>, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium">
                        {typeof row._id === "string" ? row._id : row._id && typeof row._id === "object" ? (row._id as Record<string, string>).fullName || `Tuần ${(row._id as Record<string, number>).week}` : ""}
                      </td>
                      {Object.keys(KPI_LABELS).map((k) => (
                        <td key={k} className="px-3 py-2.5 text-center">{fmt(row[k] as number || 0)}</td>
                      ))}
                      <td className="px-3 py-2.5 text-center text-gray-500">{row.entries as number}</td>
                    </tr>
                  ))}
                  {report.report?.length > 0 && (
                    <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                      <td className="px-4 py-3">Tổng</td>
                      {Object.keys(KPI_LABELS).map((k) => (
                        <td key={k} className="px-3 py-3 text-center">{fmt(report.totals?.[k] || 0)}</td>
                      ))}
                      <td className="px-3 py-3 text-center">{report.totals?.entries || 0}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
