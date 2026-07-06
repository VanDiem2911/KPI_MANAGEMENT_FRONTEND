import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { kpiApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";

interface KpiEntry {
  _id: string;
  date: string;
  ibZalo: number;
  ibFacebook: number;
  comment: number;
  baiDang: number;
  khachRep: number;
  khachChuDongIB: number;
  followUp: number;
  baoGia: number;
  chotDeal: number;
  doanhThu: number;
  nhuCauKhach: string;
  taiSaoMatKhach: string;
  ghiChu: string;
}

const toLocalYYYYMMDD = (dStr: string) => {
  const d = new Date(dStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function KpiHistoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [entries, setEntries] = useState<KpiEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<KpiEntry | null>(null);
  const limit = 15;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await kpiApi.getMyEntries({ page: String(page), limit: String(limit) });
        setEntries(res.data.data.entries);
        setTotal(res.data.data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("vi-VN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lịch sử KPI</h1>
        <p className="text-sm text-gray-500 mt-1">Xem lại KPI đã nhập</p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10">Ngày</th>
                <th className="px-4 py-3">IB Zalo</th>
                <th className="px-4 py-3">IB FB</th>
                <th className="px-4 py-3">Comment</th>
                <th className="px-4 py-3">Bài đăng</th>
                <th className="px-4 py-3">Khách rep</th>
                <th className="px-4 py-3">Follow-up</th>
                <th className="px-4 py-3">Báo giá</th>
                <th className="px-4 py-3">Chốt Deal</th>
                <th className="px-4 py-3">Doanh thu</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Đang tải...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Chưa có dữ liệu KPI</td></tr>
              ) : (
                entries.map((e) => {
                  const todayStr = toLocalYYYYMMDD(new Date().toISOString());
                  const isRowToday = toLocalYYYYMMDD(e.date) === todayStr;
                  const canEdit = isAdmin || isRowToday;
                  return (
                    <tr key={e._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                      <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400" />{fmtDate(e.date)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{e.ibZalo}</td>
                    <td className="px-4 py-3 text-center">{e.ibFacebook}</td>
                    <td className="px-4 py-3 text-center">{e.comment}</td>
                    <td className="px-4 py-3 text-center">{e.baiDang}</td>
                    <td className="px-4 py-3 text-center">{e.khachRep}</td>
                    <td className="px-4 py-3 text-center">{e.followUp}</td>
                    <td className="px-4 py-3 text-center">{e.baoGia}</td>
                    <td className="px-4 py-3 text-center font-semibold text-primary-600">{e.chotDeal}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 whitespace-nowrap">{fmt(e.doanhThu)}đ</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => setDetail(e)} className="text-gray-400 hover:text-primary-600 transition-colors" title="Xem chi tiết">
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <Link to={`/kpi/entry?date=${toLocalYYYYMMDD(e.date)}`} className="text-gray-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa ngày này">
                            <Pencil size={18} />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Trang {page} / {totalPages} ({total} bản ghi)</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary p-2 disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary p-2 disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Chi tiết KPI — {fmtDate(detail.date)}</h3>
            <div className="space-y-3">
              {[
                ["IB Zalo", detail.ibZalo], ["IB Facebook", detail.ibFacebook],
                ["Comment", detail.comment], ["Bài đăng", detail.baiDang],
                ["Khách rep", detail.khachRep], ["Khách chủ động IB", detail.khachChuDongIB],
                ["Follow-up", detail.followUp], ["Báo giá", detail.baoGia],
                ["Chốt Deal", detail.chotDeal], ["Doanh thu", fmt(detail.doanhThu) + "đ"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{value}</span>
                </div>
              ))}
              {detail.nhuCauKhach && (
                <div className="py-2">
                  <p className="text-sm text-gray-600">Nhu cầu khách</p>
                  <p className="text-sm text-gray-900 mt-1">{detail.nhuCauKhach}</p>
                </div>
              )}
              {detail.taiSaoMatKhach && (
                <div className="py-2">
                  <p className="text-sm text-gray-600">Tại sao mất khách</p>
                  <p className="text-sm text-gray-900 mt-1">{detail.taiSaoMatKhach}</p>
                </div>
              )}
              {detail.ghiChu && (
                <div className="py-2">
                  <p className="text-sm text-gray-600">Ghi chú</p>
                  <p className="text-sm text-gray-900 mt-1">{detail.ghiChu}</p>
                </div>
              )}
            </div>
            <button onClick={() => setDetail(null)} className="btn-secondary w-full mt-6">Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
