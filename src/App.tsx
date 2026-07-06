import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/Layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import KpiEntryPage from "./pages/KpiEntryPage";
import KpiHistoryPage from "./pages/KpiHistoryPage";
import KpiManagePage from "./pages/KpiManagePage";
import KpiTargetPage from "./pages/KpiTargetPage";
import ReportPage from "./pages/ReportPage";
import ComparePage from "./pages/ComparePage";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="kpi/entry" element={<KpiEntryPage />} />
              <Route path="kpi/history" element={<KpiHistoryPage />} />
              <Route path="kpi/manage" element={<ProtectedRoute adminOnly><KpiManagePage /></ProtectedRoute>} />
              <Route path="kpi/target" element={<ProtectedRoute adminOnly><KpiTargetPage /></ProtectedRoute>} />
              <Route path="report" element={<ProtectedRoute adminOnly><ReportPage /></ProtectedRoute>} />
              <Route path="compare" element={<ProtectedRoute adminOnly><ComparePage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
