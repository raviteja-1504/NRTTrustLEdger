import type { ReactNode } from "react";
import type { Permission } from "../types";
import type { AuthCtx } from "../rbac";
import { useAuth } from "./AuthContext";

interface CanProps {
  permission?: Permission;
  anyOf?: Permission[];
  /** Optional scope for attribute-aware checks (classId, studentId, subject). */
  ctx?: AuthCtx;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * UX-only visibility gate. NOT a security boundary.
 *   <Can permission="fees.write"><Button>Collect</Button></Can>
 *   <Can permission="students.marks.write" ctx={{ classId, subject }}>...</Can>
 */
export function Can({ permission, anyOf, ctx, fallback = null, children }: CanProps) {
  const { can } = useAuth();
  const allowed =
    (permission ? can(permission, ctx) : false) ||
    (anyOf ? anyOf.some((p) => can(p, ctx)) : false) ||
    (!permission && !anyOf); // if nothing specified, render
  return <>{allowed ? children : fallback}</>;
}
