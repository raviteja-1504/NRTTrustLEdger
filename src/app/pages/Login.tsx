import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { School, Loader2 } from "lucide-react";
import { useAuth, type LoginApiResponse } from "../../lib/auth/AuthContext";
import { api, ApiError } from "../../lib/api/client";

export default function Login() {
  const { loginWithResponse } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Backend wraps all responses in { data: {...} }
      const envelope = await api.post<{ data: LoginApiResponse }>("/auth/login", { identifier, password });
      const res = envelope.data;
      if (res.memberships && res.memberships.length > 1) {
        navigate("/pick-school", { state: { identity: res.identity, memberships: res.memberships } });
      } else {
        loginWithResponse(res);
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
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
            <h1 className="text-xl font-semibold text-[#1A237E] dark:text-white">Patashala</h1>
            <p className="text-xs text-gray-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">
              Mobile number or Email
            </label>
            <input
              type="text"
              required
              placeholder="9876543210 or name@school.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00897B] focus:ring-2 focus:ring-[#00897B]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#00897B] focus:ring-2 focus:ring-[#00897B]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A237E] py-2.5 text-sm font-medium text-white transition hover:bg-[#283593] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </motion.div>
    </div>
  );
}
