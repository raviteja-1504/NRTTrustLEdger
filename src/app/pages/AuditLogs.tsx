import { useState } from "react";
import { motion } from "motion/react";
import { ClipboardCheck, UserCog, Pencil, Trash2, Plus, Search, Download } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";

interface LogEntry {
  id: string; when: string; actor: string; role: string;
  action: "create" | "update" | "delete" | "login";
  resource: string; detail: string; ip: string;
}

const logs: LogEntry[] = [
  { id: "0", when: "11:20 AM", actor: "Suresh Patel", role: "Accountant", action: "update", resource: "Student Fee Structure", detail: "updated Rahul Kumar fee heads and discount note", ip: "10.0.1.31" },
  { id: "1", when: "10:42 AM", actor: "Rajesh Iyer",  role: "School Admin",      action: "update", resource: "Fee #F-2201",    detail: "marked paid via Bank",            ip: "10.0.1.22" },
  { id: "2", when: "10:15 AM", actor: "Anita Rao",    role: "Teacher",           action: "create", resource: "Attendance 8-A", detail: "marked attendance for 35 students", ip: "10.0.1.18" },
  { id: "3", when: "09:58 AM", actor: "Neha Gupta",   role: "Admissions Officer",action: "update", resource: "Lead #L-891",    detail: "moved Campus Visit → Entrance Test", ip: "10.0.1.45" },
  { id: "4", when: "09:30 AM", actor: "Suresh Patel", role: "Accountant",        action: "create", resource: "Expense #E-442", detail: "Electricity bill ₹28,400",        ip: "10.0.1.31" },
  { id: "5", when: "09:05 AM", actor: "Priya Sharma", role: "Super Admin",       action: "delete", resource: "User #U-117",    detail: "revoked teacher access",          ip: "10.0.1.2"  },
  { id: "6", when: "08:50 AM", actor: "Rajesh Iyer",  role: "School Admin",      action: "login",  resource: "Auth",           detail: "successful login via SSO",         ip: "10.0.1.22" },
];

const actionStyle: Record<LogEntry["action"], { bg: string; icon: typeof Plus }> = {
  create: { bg: "bg-emerald-50 text-emerald-700",  icon: Plus },
  update: { bg: "bg-sky-50 text-sky-700",          icon: Pencil },
  delete: { bg: "bg-red-50 text-red-700",          icon: Trash2 },
  login:  { bg: "bg-indigo-50 text-indigo-700",    icon: UserCog },
};

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export default function AuditLogs() {
  const [q, setQ] = useState("");
  const today = new Date();
  const maxDate = toInputDate(today);
  const minDate = toInputDate(addMonths(today, -12));
  const [exportFrom, setExportFrom] = useState(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [exportTo, setExportTo] = useState(maxDate);
  const filtered = logs.filter((l) => (l.actor + l.resource + l.detail).toLowerCase().includes(q.toLowerCase()));
  const fromDate = new Date(`${exportFrom}T00:00:00`);
  const toDate = new Date(`${exportTo}T23:59:59`);
  const exportSpanMs = toDate.getTime() - fromDate.getTime();
  const exportValid =
    Boolean(exportFrom && exportTo) &&
    fromDate <= toDate &&
    exportTo <= maxDate &&
    exportSpanMs <= 366 * 24 * 60 * 60 * 1000;

  const handleExport = () => {
    if (!exportValid) return;
    alert(`Exporting audit logs from ${exportFrom} to ${exportTo}`);
  };

  return (
    <PageShell>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable record of every write action — who, what, when, where"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              aria-label="Export from date"
            />
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
              aria-label="Export to date"
            />
            <button
              onClick={handleExport}
              disabled={!exportValid}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        }
      />

      <BentoCard className="mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
            <Search className="h-4 w-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by actor, resource, detail…" className="flex-1 bg-transparent outline-none" />
          </div>
          {!exportValid && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Export date range must be in the past, end no later than today, and cover at most 12 months.
            </div>
          )}
        </div>
      </BentoCard>

      <BentoCard padding={false}>
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#00897B]" />
            <h2 className="text-lg font-semibold text-[#1A237E] dark:text-white">Today</h2>
            <span className="ml-auto text-xs text-gray-500">{filtered.length} entries</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {filtered.map((l, i) => {
            const S = actionStyle[l.action];
            const Icon = S.icon;
            return (
              <motion.div key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-white/5">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${S.bg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-medium text-[#1A237E] dark:text-white">{l.actor}</span>
                    <span className="text-xs text-gray-500">({l.role})</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{l.action} <b className="text-gray-800 dark:text-gray-200">{l.resource}</b></span>
                    <span className="ml-auto text-xs text-gray-400">{l.when}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">{l.detail} · from <code className="rounded bg-gray-100 px-1 py-0.5 text-[10px] dark:bg-white/10">{l.ip}</code></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </BentoCard>
    </PageShell>
  );
}
