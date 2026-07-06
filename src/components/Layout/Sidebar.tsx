import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard, FileEdit, History, Settings, Target, BarChart3,
  GitCompareArrows, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";


const userMenu = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/kpi/entry", label: "Nhập KPI", icon: FileEdit },
  { path: "/kpi/history", label: "Lịch sử KPI", icon: History },
];

const adminMenu = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/kpi/manage", label: "Quản lý KPI", icon: Settings },
  { path: "/kpi/target", label: "KPI Target", icon: Target },
  { path: "/report", label: "Báo cáo", icon: BarChart3 },
  { path: "/compare", label: "So sánh", icon: GitCompareArrows },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const menu = isAdmin ? adminMenu : userMenu;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex flex-col z-30 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <img
          src="/assets/logo.png"
          alt="DUDI Software"
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-primary-600 truncate">DUDI</h1>
            <p className="text-[10px] text-gray-400 -mt-1">KPI Management</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 ${isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"}`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info + Logout */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-gray-800 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isAdmin ? "bg-primary-100 text-primary-700" : "bg-blue-100 text-blue-700"
            }`}>
              {user?.role}
            </span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          title="Đăng xuất"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-all"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
