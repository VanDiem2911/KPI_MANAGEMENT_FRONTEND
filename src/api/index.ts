import api from "./axios";

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (data: { email: string; password: string; fullName: string; role?: string; department?: string; position?: string }) =>
    api.post("/api/auth/register", data),
};

export const kpiApi = {
  create: (data: any) =>
    api.post("/api/kpi", data),
  getMyEntries: (params?: Record<string, string>) =>
    api.get("/api/kpi", { params }),
  getAll: (params?: Record<string, string>) =>
    api.get("/api/kpi/all", { params }),
  getById: (id: string) =>
    api.get(`/api/kpi/${id}`),
  update: (id: string, data: any) =>
    api.put(`/api/kpi/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/kpi/${id}`),
};

export const dashboardApi = {
  get: (params?: Record<string, string>) => api.get("/api/kpi/dashboard", { params }),
};

export const reportApi = {
  get: (params?: Record<string, string>) =>
    api.get("/api/kpi/report", { params }),
  export: (params?: Record<string, string>) =>
    api.get("/api/kpi/report/export", { params, responseType: params?.format === "csv" ? "blob" : "json" }),
};

export const compareApi = {
  get: (params?: Record<string, string>) =>
    api.get("/api/kpi/compare", { params }),
};

export const targetApi = {
  getAll: (params?: Record<string, string>) =>
    api.get("/api/kpi/target", { params }),
  create: (data: any) =>
    api.post("/api/kpi/target", data),
  update: (id: string, data: any) =>
    api.put(`/api/kpi/target/${id}`, data),
  delete: (id: string) =>
    api.delete(`/api/kpi/target/${id}`),
};

export const usersApi = {
  getAll: () => api.get("/api/kpi/users"),
};
