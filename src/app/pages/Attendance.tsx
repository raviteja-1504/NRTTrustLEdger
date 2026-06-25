import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, Clock4, Plane, Users, Send, Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";
import { useAuth } from "../../lib/auth/AuthContext";
import { studentsService, classSectionsService } from "../../lib/services/students.service";
import type { AttendanceStatus, ApiStudent, ApiClassSection } from "../../lib/services/types";

interface StudentRow {
  id: string;
  roll: number;
  name: string;
  status: AttendanceStatus;
}

const statusStyles: Record<AttendanceStatus, { bg: string; text: string; ring: string; label: string; icon: typeof CheckCircle2 }> = {
  present: { bg: "bg-emerald-50",  text: "text-emerald-700",  ring: "ring-emerald-200",  label: "Present", icon: CheckCircle2 },
  absent:  { bg: "bg-red-50",      text: "text-red-700",      ring: "ring-red-200",      label: "Absent",  icon: XCircle },
  late:    { bg: "bg-amber-50",    text: "text-amber-700",    ring: "ring-amber-200",    label: "Late",    icon: Clock4 },
  leave:   { bg: "bg-sky-50",      text: "text-sky-700",      ring: "ring-sky-200",      label: "Leave",   icon: Plane },
};

export default function Attendance() {
  const { user } = useAuth();
  const [sections, setSections] = useState<ApiClassSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [roster, setRoster] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    classSectionsService.list().then((res) => {
      setSections(res.data);
      if (res.data.length > 0) setSelectedSectionId(res.data[0].id);
    }).catch(() => setSections([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSectionId) return;
    setLoading(true);
    studentsService.list({ class_section_id: selectedSectionId, page_size: 200 })
      .then((res) => {
        setStudents(res.data);
        setRoster(res.data.map((s, i) => ({ id: s.id, roll: i + 1, name: s.name, status: "present" as AttendanceStatus })));
      })
      .catch(() => { setStudents([]); setRoster([]); })
      .finally(() => setLoading(false));
  }, [selectedSectionId]);

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const cls = selectedSection ? `${selectedSection.grade}-${selectedSection.section}` : "";

  const summary = useMemo(() => {
    const total = roster.length;
    const c = { present: 0, absent: 0, late: 0, leave: 0 } as Record<AttendanceStatus, number>;
    roster.forEach((r) => (c[r.status] += 1));
    return { total, ...c, pct: Math.round((c.present / total) * 100) };
  }, [roster]);

  const setStatus = (id: string, status: AttendanceStatus) =>
    setRoster((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));

  const markAll = (status: AttendanceStatus) =>
    setRoster((rs) => rs.map((r) => ({ ...r, status })));

  const save = async () => {
    setSaving(true);
    try {
      const payload = roster.map((r) => ({
        student_id: r.id,
        status: r.status,
        date,
      }));
      await studentsService.bulkMarkAttendance(payload);
      toast.success(`Attendance saved for ${cls} on ${date}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };
  const notifyAbsent = () => {
    const n = roster.filter((r) => r.status === "absent").length;
    toast.success(n ? `SMS queued for ${n} absent parents` : "No absentees today");
  };

  return (
    <PageShell>
      <PageHeader
        title="Attendance"
        subtitle="Daily class-wise attendance marking with live summary"
        actions={
          <>
            <button onClick={() => markAll("present")} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              Mark all present
            </button>
            <Can permission="communications.write">
              <button onClick={notifyAbsent} className="flex items-center gap-2 rounded-lg bg-[#FF9800] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#F57C00]">
                <Send className="h-4 w-4" /> Notify absentees
              </button>
            </Can>
            <Can permission="attendance.write" ctx={{ classId: cls }}>
              <button onClick={save} className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#283593]">
                Save
              </button>
            </Can>
          </>
        }
      />

      {/* Teacher without any in-charge class → show friendly banner */}
      {user?.role === "teacher" && sections.length === 0 && (
        <BentoCard className="mb-6">
          <div className="flex items-start gap-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 text-[#FF9800]" />
            <div>
              <div className="font-medium text-[#1A237E]">No class sections configured.</div>
              <div className="text-gray-600">Ask the school admin to create class sections in Settings.</div>
            </div>
          </div>
        </BentoCard>
      )}

      {/* Filters */}
      <BentoCard className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Class</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={sections.length === 0}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5"
            >
              {sections.length === 0 ? <option value="">No sections</option> : sections.map((s) => <option key={s.id} value={s.id}>Grade {s.grade} - {s.section}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5" />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Download className="h-4 w-4 text-gray-500" />
            <button className="text-[#00897B] hover:underline">Export month CSV</button>
          </div>
        </div>
      </BentoCard>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi icon={Users}      tone="indigo"  label="Total"   value={summary.total} />
        <Kpi icon={CheckCircle2} tone="emerald" label="Present" value={summary.present} sub={`${summary.pct}%`} />
        <Kpi icon={XCircle}    tone="red"     label="Absent"  value={summary.absent} />
        <Kpi icon={Clock4}     tone="amber"   label="Late"    value={summary.late} />
        <Kpi icon={Plane}      tone="sky"     label="Leave"   value={summary.leave} />
      </div>

      {/* Roster */}
      <BentoCard padding={false}>
        <div className="border-b border-gray-100 px-6 py-4 dark:border-white/10">
          <h2 className="text-lg font-semibold text-[#1A237E] dark:text-white">Class {cls} — {date}</h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/10">
          {roster.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-4 px-6 py-3"
            >
              <div className="w-8 text-sm font-medium text-gray-500">#{r.roll}</div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1A237E] to-[#00897B] text-xs font-semibold text-white">
                {r.name.split(" ").map((n) => n[0]).slice(0,2).join("")}
              </div>
              <div className="flex-1 font-medium text-gray-800 dark:text-gray-100">{r.name}</div>
              <div className="flex gap-1">
                {(["present","late","absent","leave"] as AttendanceStatus[]).map((s) => {
                  const S = statusStyles[s];
                  const active = r.status === s;
                  const Icon = S.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(r.id, s)}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 transition ${
                        active ? `${S.bg} ${S.text} ${S.ring}` : "bg-transparent text-gray-400 ring-gray-200 hover:bg-gray-50 dark:ring-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {S.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </BentoCard>

      {/* Monthly heatmap stub */}
      <BentoCard className="mt-6">
        <h3 className="mb-4 text-base font-semibold text-[#1A237E] dark:text-white">This month — attendance heatmap</h3>
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {roster.slice(0, 8).map((student, si) => (
            <div key={student.id} className="contents">
              <div className="truncate pr-3 text-xs text-gray-600 dark:text-gray-400">{student.name}</div>
              <div className="flex gap-1">
                {Array.from({ length: 22 }).map((_, d) => {
                  const v = (si * 3 + d) % 7;
                  const color = v === 0 ? "bg-red-400" : v === 1 ? "bg-amber-300" : "bg-emerald-400";
                  return <div key={d} className={`h-4 w-4 rounded-sm ${color} opacity-${v === 0 ? 80 : v === 1 ? 70 : 90}`} title={`Day ${d+1}`} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
          <span className="h-3 w-3 rounded-sm bg-emerald-400"/> Present
          <span className="h-3 w-3 rounded-sm bg-amber-300"/> Late
          <span className="h-3 w-3 rounded-sm bg-red-400"/> Absent
        </div>
      </BentoCard>
    </PageShell>
  );
}

function Kpi({ icon: Icon, tone, label, value, sub }: { icon: typeof CheckCircle2; tone: "indigo"|"emerald"|"red"|"amber"|"sky"; label: string; value: number; sub?: string }) {
  const tones = {
    indigo:  "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red:     "bg-red-50 text-red-600",
    amber:   "bg-amber-50 text-amber-600",
    sky:     "bg-sky-50 text-sky-600",
  } as const;
  return (
    <BentoCard>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold text-[#1A237E] dark:text-white">
            {value}{sub && <span className="ml-2 text-xs font-normal text-gray-500">{sub}</span>}
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
