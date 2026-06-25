import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Tenant } from "../types";

interface TenantContextValue {
  tenant: Tenant;
  setTenant: (t: Tenant) => void;
  hasFeature: (key: string) => boolean;
}

// Default tenant for local dev. In production the tenant is resolved from
// the subdomain or JWT claim before the React tree renders.
export const defaultTenant: Tenant = {
  id: "t_meridian",
  name: "Meridian School",
  shortCode: "meridian",
  locale: "en-IN",
  currency: "INR",
  timezone: "Asia/Kolkata",
  academicYear: "2026-2027",
  features: {
    library: true,
    parentPortal: true,
    predictiveAdmissions: false,
    pwa: true,
    communications: false,  // hidden in MVP — enable when SMS/email integrations are ready
  },
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({
  initial = defaultTenant,
  children,
}: {
  initial?: Tenant;
  children: ReactNode;
}) {
  const [tenant, setTenant] = useState<Tenant>(initial);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      setTenant,
      hasFeature: (key) => !!tenant.features[key],
    }),
    [tenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within <TenantProvider>");
  return ctx;
}
