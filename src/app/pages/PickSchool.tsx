import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { School, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth, type LoginApiResponse } from "../../lib/auth/AuthContext";
import { api, ApiError } from "../../lib/api/client";
import type { TenantMembership } from "../../lib/types";

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  accountant: "Accountant",
  admissions_officer: "Admissions Officer",
  parent: "Parent",
};

export default function PickSchool() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginWithResponse } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const state = location.state as {
    identity: LoginApiResponse["identity"];
    memberships: TenantMembership[];
  } | null;

  if (!state?.memberships?.length) {
    navigate("/login", { replace: true });
    return null;
  }

  async function selectMembership(membership: TenantMembership) {
    setLoading(membership.id);
    setError(null);
    try {
      const res = await api.post<LoginApiResponse>("/auth/select-membership", {
        membership_id: membership.id,
      });
      loginWithResponse(res);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to select school");
      setLoading(null);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#1A237E] via-[#283593] to-[#00897B] p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-[#1a1d24]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A237E]">
            <School className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1A237E] dark:text-white">Choose School</h1>
            <p className="text-xs text-gray-500">
              Signed in as {state.identity.name}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {state.memberships.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMembership(m)}
              disabled={loading !== null}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-[#1A237E] hover:bg-[#1A237E]/5 disabled:opacity-60 dark:border-white/10 dark:hover:border-white/30"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {m.tenant_name ?? "School"}
                </p>
                <p className="text-xs text-gray-500">
                  {roleLabels[m.role] ?? m.role}
                </p>
              </div>
              {loading === m.id && <Loader2 className="h-4 w-4 animate-spin text-[#1A237E]" />}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={() => navigate("/login")}
          className="mt-6 w-full text-center text-xs text-gray-400 hover:text-gray-600"
        >
          ← Sign in with a different account
        </button>
      </motion.div>
    </div>
  );
}
