import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { authApi } from "../api";

interface User {
  _id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "USER";
  department: string;
  position: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("kpi_token");
    const savedUser = localStorage.getItem("kpi_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: newToken, user: newUser } = res.data.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("kpi_token", newToken);
    localStorage.setItem("kpi_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("kpi_token");
    localStorage.removeItem("kpi_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === "ADMIN", isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
