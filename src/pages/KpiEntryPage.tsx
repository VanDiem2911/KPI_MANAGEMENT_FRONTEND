import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { kpiApi, usersApi, targetApi } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { Save, CheckCircle, AlertTriangle, X } from "lucide-react";

interface KpiFormData {
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

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = getLocalTodayString();

const getNum = (v: any) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

interface KpiEntryPageProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  defaultDate?: string;
}

export default function KpiEntryPage({ isModal = false, onClose, onSuccess, defaultDate }: KpiEntryPageProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get("date") || today;

  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm<KpiFormData>({
    defaultValues: { date: queryDate, ibZalo: "" as any, ibFacebook: "" as any, comment: "" as any, baiDang: "" as any, khachRep: "" as any, khachChuDongIB: "" as any, followUp: "" as any, baoGia: "" as any, chotDeal: "" as any, doanhThu: "" as any, nhuCauKhach: "", taiSaoMatKhach: "", ghiChu: "" },
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isUpdate, setIsUpdate] = useState(false);
  const [users, setUsers] = useState<{ _id: string; fullName: string }[]>([]);
  const [targetUserId, setTargetUserId] = useState(user?._id || "");
  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    targetApi.getAll().then((res: any) => {
      setTargets(res.data.data);
    }).catch(() => {});
  }, []);

  const watchDate = watch("date");
  const watchIbZalo = watch("ibZalo");
  const watchIbFacebook = watch("ibFacebook");
  const watchKhachRep = watch("khachRep");
  const watchFollowUp = watch("followUp");
  const watchBaoGia = watch("baoGia");
  const watchChotDeal = watch("chotDeal");
  const watchKhachChuDongIB = watch("khachChuDongIB");

  const entryMonth = watchDate ? watchDate.substring(0, 7) : "";
  const userTarget = targets.find(t => t.type === "USER" && t.targetRef === targetUserId && t.month === entryMonth);
  const companyTarget = targets.find(t => t.type === "COMPANY" && t.targetRef === "ALL" && t.month === entryMonth);
  const activeTarget = userTarget || companyTarget;

  const isAdmin = user?.role === "ADMIN";
  const isToday = watchDate === today;
  const isEditable = isAdmin || isToday;

  useEffect(() => {
    if (user?.role === "ADMIN") {
      usersApi.getAll().then((res: any) => {
        setUsers(res.data.data.users);
      }).catch(() => {});
    }
  }, [user]);

  // Sync form date when URL query param or defaultDate changes
  useEffect(() => {
    const activeDate = defaultDate || queryDate || today;
    if (activeDate) {
      setValue("date", activeDate);
    }
  }, [defaultDate, queryDate, setValue]);

  // Load existing KPI for selected date and target employee
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const params: Record<string, string> = { startDate: watchDate, endDate: watchDate };
        if (isAdmin && targetUserId) {
          params.userId = targetUserId;
        }
        const res = await kpiApi.getMyEntries(params);
        const entries = res.data.data?.entries;
        if (entries && entries.length > 0) {
          const entry = entries[0];
          Object.keys(entry).forEach((key) => {
            if (key !== "_id" && key !== "userId" && key !== "createdAt" && key !== "updatedAt" && key !== "__v") {
              if (key === "date") {
                setValue("date", new Date(entry.date).toISOString().split("T")[0]);
              } else {
                const val = entry[key];
                if (typeof val === "number" && val === 0) {
                  setValue(key as keyof KpiFormData, "" as any);
                } else {
                  setValue(key as keyof KpiFormData, val);
                }
              }
            }
          });
          setIsUpdate(true);
        } else {
          reset({ date: watchDate, ibZalo: "" as any, ibFacebook: "" as any, comment: "" as any, baiDang: "" as any, khachRep: "" as any, khachChuDongIB: "" as any, followUp: "" as any, baoGia: "" as any, chotDeal: "" as any, doanhThu: "" as any, nhuCauKhach: "", taiSaoMatKhach: "", ghiChu: "" });
          setIsUpdate(false);
        }
      } catch { /* ignore */ }
    };
    if (watchDate && targetUserId) loadExisting();
  }, [watchDate, targetUserId, setValue, reset, isAdmin]);

  const needNhuCau = getNum(watchKhachChuDongIB) > 0;
  const needTaiSao = getNum(watchKhachRep) > getNum(watchBaoGia) || getNum(watchKhachRep) > getNum(watchChotDeal);

  const onSubmit = async (formData: KpiFormData) => {
    if (!isEditable) {
      setError("Bạn không có quyền nhập hoặc chỉnh sửa KPI của ngày cũ.");
      return;
    }

    if (getNum(formData.khachChuDongIB) > 0 && !formData.nhuCauKhach?.trim()) {
      setError("Nhu cầu khách là bắt buộc khi Khách chủ động IB > 0");
      return;
    }
    if ((getNum(formData.khachRep) > getNum(formData.baoGia) || getNum(formData.khachRep) > getNum(formData.chotDeal)) && !formData.taiSaoMatKhach?.trim()) {
      setError("Tại sao mất khách là bắt buộc khi Khách rep > Báo giá hoặc Khách rep > Chốt Deal");
      return;
    }
    if (getNum(formData.doanhThu) > 0 && getNum(formData.chotDeal) === 0) {
      setError("Doanh thu chỉ có thể lớn hơn 0 khi đã Chốt Deal (Chốt Deal phải > 0)");
      return;
    }
    if (getNum(formData.chotDeal) > 0 && getNum(formData.doanhThu) === 0) {
      setError("Khi Chốt Deal lớn hơn 0, Doanh thu phải lớn hơn 0");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess(false);

    // Clean data: convert NaN or empty values to 0
    const cleanData = { ...formData } as any;
    if (isAdmin && targetUserId) {
      cleanData.userId = targetUserId;
    }
    const numericFields = [
      "ibZalo", "ibFacebook", "comment", "baiDang", "khachRep",
      "khachChuDongIB", "followUp", "baoGia", "chotDeal", "doanhThu"
    ];
    for (const key of numericFields) {
      const val = cleanData[key as keyof KpiFormData];
      if (val === "" || val === undefined || val === null || isNaN(Number(val))) {
        (cleanData as any)[key] = 0;
      } else {
        (cleanData as any)[key] = Number(val);
      }
    }

    try {
      await kpiApi.create(cleanData);
      setSuccess(true);
      setIsUpdate(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        if (onClose) onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || "Lỗi khi lưu KPI";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const fieldGroup = (title: string, fields: { name: keyof KpiFormData; label: string; type?: string; min?: number; max?: number; required?: boolean; placeholder?: string }[]) => (
    <div className="card">
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const targetVal = activeTarget?.targets?.[f.name] || 0;
          const currentVal = Number(watch(f.name)) || 0;
          const watchDate = watch("date");
          const dateObj = watchDate ? new Date(watchDate) : new Date();
          const dayOfWeek = dateObj.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const hasTarget = targetVal > 0 && !isWeekend;
          const isKpiAchieved = currentVal >= targetVal;

          return (
            <div key={f.name}>
              <label className="label">
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  {...register(f.name, { required: f.required ? `${f.label} là bắt buộc` : false })}
                  className="input-field min-h-[80px] disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  placeholder={f.placeholder}
                  disabled={!isEditable}
                />
              ) : (
                <input
                  type={f.type || "number"}
                  step={f.type === "textarea" || f.type === "text" ? undefined : "1"}
                  onKeyDown={(e) => {
                    if (f.type !== "textarea" && f.type !== "text" && (e.key === "." || e.key === ",")) {
                      e.preventDefault();
                    }
                  }}
                  {...register(f.name, {
                    required: f.required ? `${f.label} là bắt buộc` : false,
                    valueAsNumber: f.type !== "textarea" && f.type !== "text",
                    min: f.min !== undefined ? { value: f.min, message: `${f.label} phải >= ${f.min}` } : undefined,
                    max: f.max !== undefined ? { value: f.max, message: `${f.label} phải <= ${f.max}` } : undefined,
                    validate: f.type !== "textarea" && f.type !== "text" ? (v) => {
                      if (v === "" || v === undefined || v === null || isNaN(Number(v))) return true;
                      return Number.isInteger(Number(v)) || "Phải là số nguyên";
                    } : undefined,
                  })}
                  className="input-field disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                  placeholder={f.placeholder || "0"}
                  disabled={!isEditable}
                />
              )}
              {hasTarget && f.type !== "textarea" && (
                <p className={`text-[11px] mt-1 font-semibold ${isKpiAchieved ? "text-emerald-600" : "text-rose-600"}`}>
                  {isKpiAchieved 
                    ? `✅ Đạt KPI (Yêu cầu: ${targetVal.toLocaleString("vi-VN")})` 
                    : `⚠️ Chưa đủ KPI (Yêu cầu: ${targetVal.toLocaleString("vi-VN")})`
                  }
                </p>
              )}
              {errors[f.name] && (
                <p className="text-xs text-red-500 mt-1">{errors[f.name]?.message}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const formContent = (
    <>
      {/* Date & User selectors */}
      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Ngày nhập KPI</label>
          <input
            type="date"
            {...register("date", { required: true })}
            className="input-field disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
            max={today}
            disabled={!isAdmin}
          />
        </div>
        {isAdmin && (
          <div>
            <label className="label">Nhân viên</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="input-field"
            >
              <option value={user?._id}>Bản thân (Admin)</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.fullName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {fieldGroup("IB (Inbound)", [
        { name: "ibZalo", label: "IB Zalo", min: 0 },
        { name: "ibFacebook", label: "IB Facebook", min: 0 },
      ])}

      {fieldGroup("Tương tác", [
        { name: "comment", label: "Comment", min: 0 },
        { name: "baiDang", label: "Bài đăng", min: 0 },
      ])}

      {fieldGroup("Khách hàng", [
        { name: "khachRep", label: `Khách rep (max: ${getNum(watchIbZalo) + getNum(watchIbFacebook)})`, min: 0, max: getNum(watchIbZalo) + getNum(watchIbFacebook) },
        { name: "khachChuDongIB", label: "Khách chủ động IB", min: 0 },
      ])}

      {fieldGroup("Chăm sóc", [
        { name: "followUp", label: `Follow-up (max: ${getNum(watchKhachRep)})`, min: 0, max: getNum(watchKhachRep) },
        { name: "baoGia", label: `Báo giá (max: ${getNum(watchFollowUp)})`, min: 0, max: getNum(watchFollowUp) },
      ])}

      {fieldGroup("Kết quả", [
        { name: "chotDeal", label: `Chốt Deal (max: ${getNum(watchBaoGia)})`, min: 0, max: getNum(watchBaoGia) },
        { name: "doanhThu", label: "Doanh thu (VNĐ)", min: 0 },
      ])}

      {fieldGroup("Thông tin bổ sung", [
        { name: "nhuCauKhach", label: "Nhu cầu khách", type: "textarea", required: needNhuCau, placeholder: needNhuCau ? "Bắt buộc khi có khách chủ động IB" : "Không bắt buộc" },
        { name: "taiSaoMatKhach", label: "Tại sao mất khách", type: "textarea", required: needTaiSao, placeholder: needTaiSao ? "Bắt buộc khi khách rep > báo giá hoặc chốt deal" : "Không bắt buộc" },
        { name: "ghiChu", label: "Ghi chú", type: "textarea", placeholder: "Ghi chú thêm..." },
      ])}
    </>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-gray-50 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold">Nhập KPI</h2>
              <p className="text-xs text-red-100 mt-0.5">
                {isUpdate ? "Cập nhật KPI cho ngày đã chọn" : "Nhập KPI mới cho ngày đã chọn"}
              </p>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                <CheckCircle size={16} /> Lưu thành công!
              </div>
            )}
            {!isEditable && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
                <AlertTriangle size={16} /> Bạn chỉ được phép nhập hoặc chỉnh sửa KPI của ngày hôm nay ({today}). Những ngày trước đó đã bị khóa.
              </div>
            )}

            <form id="kpi-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {formContent}
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
              Hủy
            </button>
            <button type="submit" form="kpi-modal-form" disabled={saving || !isEditable} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm">
              <Save size={16} />
              {saving ? "Đang lưu..." : isUpdate ? "Cập nhật KPI" : "Lưu KPI"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhập KPI</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isUpdate ? "Cập nhật KPI cho ngày đã chọn" : "Nhập KPI mới cho ngày đã chọn"}
          </p>
        </div>
        {isUpdate && isEditable && (
          <span className="flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg font-medium">
            <AlertTriangle size={16} /> Đã có dữ liệu — sẽ cập nhật
          </span>
        )}
        {!isEditable && (
          <span className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
            <AlertTriangle size={16} /> Chế độ xem (Đã khóa chỉnh sửa)
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle size={16} /> Lưu thành công!
        </div>
      )}
      {!isEditable && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle size={16} /> Bạn chỉ được phép nhập hoặc chỉnh sửa KPI của ngày hôm nay ({today}). Những ngày trước đó đã bị khóa.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {formContent}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || !isEditable} className="btn-primary flex items-center gap-2 px-6 py-3">
            <Save size={18} />
            {saving ? "Đang lưu..." : isUpdate ? "Cập nhật KPI" : "Lưu KPI"}
          </button>
        </div>
      </form>
    </div>
  );
}
