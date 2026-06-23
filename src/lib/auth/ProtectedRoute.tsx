import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import type { Permission } from "../types";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: Permission;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  permission,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, can } = useAuth();
  const location = useLocation();

  // Don't redirect while the /auth/me session restore is in-flight
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A237E] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }
  if (permission && !can(permission)) {
    return <Navigate to="/403" replace />;
  }
  return <>{children}</>;
}
