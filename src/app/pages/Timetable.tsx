import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";
import { useAuth } from "../../lib/auth/AuthContext";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PERIODS = [
  { label: "P1", time: "08:00 – 08:45" },
  { label: "P2", time: "08:50 – 09:35" },
  { label: "P3", time: "09:40 – 10:25" },
  { label: "B",  time: "10:25 – 10:45", isBreak: true },
  { label: "P4", time: "10:45 – 11:30" },
  { label: "P5", time: "11:35 – 12:20" },
  { label: "L",  time: "12:20 – 13:00", isBreak: true },
  { label: "P6", time: "13:00 – 13:45" },
  { label: "P7", time: "13:50 – 14:35" },
];

const SUBJECTS = [
  { name: "Mathematics", teacher: "Mr. Verma", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { name: "Science",     teacher: "Ms. Rao",   color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { name: "English",     teacher: "Mr. Khan",  color: "bg-amber-50 text-amber-700 ring-amber-200" },
  { name: "Social",      teacher: "Ms. Gupta", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  { name: "Hindi",       teacher: "Mr. Joshi", color: "bg-rose-50 text-rose-700 ring-rose-200" },
  { name: "PE",          teacher: "Mr. Singh", color: "bg-teal-50 text-teal-700 ring-teal-200" },
  { name: "Computer",    teacher: "Ms. Iyer",  color: "bg-violet-50 text-violet-700 ring-violet-200" },
  { name: "Art",         teacher: "Ms. Nair",  color: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200" },
];

type Cell = { subjectIdx: number } | null;

function buildInitialGrid(): Cell[][] {
  // days × periods
  return DAYS.map((_, di) =>
    PERIODS.map((p, pi) => (p.isBreak ? null : { subjectIdx: (di + pi) % SUBJECTS.length }))
  );
}

export default function Timetable() {
  const { can } = useAuth();
  const editable = can("timetable.write");
  const [cls, setCls] = useState("9-A");
  const [grid, setGrid] = useState<Cell[][]>(() => buildInitialGrid());

  const conflicts = useMemo(() => {
    // Detect teacher double-booking across classes (same period, same teacher) — simplified.
    const issues: string[] = [];
    DAYS.forEach((_, di) =>
      PERIODS.forEach((p, pi) => {
        if (p.isBreak) return;
        const here = grid[di][pi];
        if (!here) return;
        // fabricate a "conflict" for one cell to show the UI
        if (di === 2 && pi === 4) issues.push(`${DAYS[di]} ${p.label}: ${SUBJECTS[here.subjectIdx].teacher} also in 10-B`);
      })
    );
    return issues;
  }, [grid]);

  const cycle = (di: number, pi: number) => {
    setGrid((g) =>
      g.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri !== di || ci !== pi || !cell) return cell;
          return { subjectIdx: (cell.subjectIdx + 1) % SUBJECTS.length };
        })
      )
    );
  };

  return (
    <PageShell>
      <PageHeader
        title="Timetable"
        subtitle={editable ? "Visual period builder — click a cell to rotate subjects" : "View-only — ask your school admin for changes"}
        actions={
          <>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              <Download className="h-4 w-4" /> Export PDF
            </button>
            <Can permission="timetable.write">
              <button onClick={() => toast.success("Timetable saved")} className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#283593]">
                <Plus className="h-4 w-4" /> Save
              </button>
            </Can>
          </>
        }
      />

      <BentoCard className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Class</label>
            <select value={cls} onChange={(e) => setCls(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
              {["8-A","8-B","9-A","9-B","10-A","10-B"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <span key={s.name} className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${s.color}`}>{s.name}</span>
            ))}
          </div>
        </div>
      </BentoCard>

      {conflicts.length > 0 && (
        <BentoCard className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-500/5">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-300">Scheduling conflicts</div>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-amber-700 dark:text-amber-200">
                {conflicts.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
        </BentoCard>
      )}

      <BentoCard padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5">
                <th className="w-24 border-b border-gray-100 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-white/10">Day</th>
                {PERIODS.map((p) => (
                  <th key={p.label} className={`border-b border-gray-100 px-2 py-3 text-center text-xs dark:border-white/10 ${p.isBreak ? "bg-gray-100 text-gray-400 dark:bg-white/10" : "text-gray-500"}`}>
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-[10px] font-normal">{p.time}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day, di) => (
                <tr key={day}>
                  <td className="border-b border-gray-100 px-3 py-3 font-medium text-[#1A237E] dark:border-white/10 dark:text-white">{day}</td>
                  {PERIODS.map((p, pi) => {
                    if (p.isBreak) return <td key={pi} className="border-b border-gray-100 bg-gray-50 text-center text-[10px] text-gray-400 dark:border-white/10 dark:bg-white/5">Break</td>;
                    const cell = grid[di][pi];
                    const subj = cell ? SUBJECTS[cell.subjectIdx] : null;
                    return (
                      <td key={pi} className="border-b border-gray-100 p-1 dark:border-white/10">
                        {subj && (
                          editable ? (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => cycle(di, pi)}
                              className={`w-full rounded-lg px-2 py-2 text-left ring-1 transition ${subj.color}`}
                            >
                              <div className="text-[11px] font-semibold leading-tight">{subj.name}</div>
                              <div className="mt-0.5 truncate text-[10px] opacity-80">{subj.teacher}</div>
                            </motion.button>
                          ) : (
                            <div className={`w-full cursor-default rounded-lg px-2 py-2 text-left ring-1 ${subj.color}`}>
                              <div className="text-[11px] font-semibold leading-tight">{subj.name}</div>
                              <div className="mt-0.5 truncate text-[10px] opacity-80">{subj.teacher}</div>
                            </div>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BentoCard>
    </PageShell>
  );
}
