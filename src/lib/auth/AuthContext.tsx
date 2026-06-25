import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Permission, Role, TenantMembership, User } from "../types";
import { authorize, type AuthCtx } from "../rbac";

// BackendTenant mirrors the snake_case JSON shape the Go API returns.
interface BackendTenant {
  id: string;
  name: string;
  short_code: string;
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  locale: string;
  currency: string;
  timezone: string;
  academic_year: string;
  features: Record<string, boolean>;
  plan?: string;
}

export interface LoginApiResponse {
  identity: { id: string; name: string; email: string; phone?: string; avatar_url?: string };
  membership?: TenantMembership;
  tenant?: BackendTenant;
  permissions?: string[];
  memberships?: TenantMembership[];
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true while /auth/me is in-flight on mount
  loginWithResponse: (res: LoginApiResponse) => void;
  logout: () => void;
  can: (permission: Permission, ctx?: AuthCtx) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Default mock user — Super Admin so devs see everything.
// Replace with a real /auth/me call when backend lands.
const mockUsers: Record<Role, User> = {
  super_admin: { id: "u_sa", tenantId: "t_meridian", name: "Priya Sharma", email: "priya@meridian.edu", role: "super_admin" },
  school_admin: { id: "u_ad", tenantId: "t_meridian", name: "Rajesh Iyer", email: "rajesh@meridian.edu", role: "school_admin" },
  teacher: {
    id: "u_tc",
    tenantId: "t_meridian",
    name: "Anita Rao",
    email: "anita@meridian.edu",
    role: "teacher",
    scope: {
      // Classes for which Anita is the class-teacher (can mark attendance).
      classIds: ["8-A", "9-A"],
      // Subject assignments (can enter marks). A single teacher can teach
      // the same subject in multiple classes; a class can have multiple
      // subject teachers for different subjects.
      assignments: [
        { classId: "8-A", subject: "Math" },
        { classId: "9-A", subject: "Math" },
        { classId: "8-B", subject: "Math" }, // teaches Math in 8-B but isn't class teacher
      ],
    },
  },
  accountant: { id: "u_ac", tenantId: "t_meridian", name: "Suresh Patel", email: "suresh@meridian.edu", role: "accountant" },
  admissions_officer: { id: "u_ao", tenantId: "t_meridian", name: "Neha Gupta", email: "neha@meridian.edu", role: "admissions_officer" },
  parent: { id: "u_pr", tenantId: "t_meridian", name: "Vikram Singh", email: "vikram@home.com", role: "parent", scope: { studentIds: ["s_1001"] } },
};

function userFromApiResponse(res: LoginApiResponse): User | null {
  if (!res.identity || !res.membership) return null;
  return {
    id: res.identity.id,
    tenantId: res.membership.tenant_id,
    name: res.identity.name,
    email: res.identity.email,
    role: res.membership.role as Role,
    avatarUrl: res.identity.avatar_url,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookie on every page load via /auth/me
  useEffect(() => {
    const BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? "/api/v1";
    fetch(`${BASE_URL}/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) setUser(userFromApiResponse(json.data));
      })
      .catch(() => {/* no session — stay null */})
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      loginWithResponse: (res) => {
        const u = userFromApiResponse(res);
        if (u) setUser(u);
      },
      logout: () => {
        const BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL ?? "/api/v1";
        fetch(`${BASE_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
        setUser(null);
      },
      can: (permission, ctx) => (user ? authorize(user, permission, ctx) : false),
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
