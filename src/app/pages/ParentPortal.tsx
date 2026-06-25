import { motion } from "motion/react";
import { Receipt, Megaphone, ClipboardList, CalendarCheck2, Download, GraduationCap } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";

const child = {
  name: "Aarav Mehta",
  grade: "9-A",
  admission: "ACM-2023-0214",
  photo: "AM",
  attendance: 94,
  dueFees: 12500,
  upcomingExams: 2,
};

const timeline = [
  { when: "Today",      text: "Math worksheet uploaded by Mr. Verma" },
  { when: "Yesterday",  text: "Attendance marked present for full week" },
  { when: "2 days ago", text: "Mid-Term schedule shared" },
  { when: "3 days ago", text: "Fee reminder: Q2 instalment due 30 Oct" },
];

const reportCards = [
  { term: "Term 1 — 2025-26", percent: 86, grade: "A" },
  { term: "Term 2 — 2025-26", percent: 82, grade: "A" },
  { term: "Mid-Term — 2026-27", percent: 79, grade: "B+" },
];

export default function ParentPortal() {
  return (
    <PageShell>
      <PageHeader
        title={`Welcome back — parent of ${child.name}`}
        subtitle="Your child's academics, fees, and school updates in one place"
      />

      <div className="grid grid-cols-12 gap-6">
        <BentoCard className="col-span-12 lg:col-span-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A237E] to-[#00897B] text-xl font-semibold text-white">{child.photo}</div>
            <div>
              <div className="text-lg font-semibold text-[#1A237E] dark:text-white">{child.name}</div>
              <div className="text-sm text-gray-500">Class {child.grade} · #{child.admission}</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <Mini icon={CalendarCheck2} label="Attendance" value={`${child.attendance}%`} tone="text-emerald-600" />
            <Mini icon={Receipt}        label="Due Fees"   value={`₹${(child.dueFees / 1000).toFixed(1)}k`} tone="text-amber-600" />
            <Mini icon={ClipboardList}  label="Exams"      value={String(child.upcomingExams)} tone="text-indigo-600" />
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-8">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Recent updates</h2>
          <div className="space-y-3">
            {timeline.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/10">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F2FD] text-[#1A237E]"><Megaphone className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="text-sm text-gray-800 dark:text-gray-100">{t.text}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{t.when}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-7">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Report Cards</h2>
          <div className="space-y-3">
            {reportCards.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-white/10">
                <GraduationCap className="h-5 w-5 text-[#00897B]" />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{r.term}</div>
                  <div className="text-xs text-gray-500">Overall {r.percent}% · Grade {r.grade}</div>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg bg-[#1A237E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#283593]">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </motion.div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-5">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Fee summary</h2>
          <div className="rounded-lg bg-gradient-to-br from-[#1A237E] to-[#00897B] p-5 text-white">
            <div className="text-xs uppercase opacity-80">Next instalment</div>
            <div className="mt-1 text-3xl font-semibold">₹{child.dueFees.toLocaleString("en-IN")}</div>
            <div className="mt-1 text-xs opacity-80">Due 30 October 2026</div>
            <button className="mt-4 w-full rounded-lg bg-white/15 py-2 text-sm font-medium backdrop-blur hover:bg-white/25">Pay securely</button>
          </div>
          <div className="mt-3 text-xs text-gray-500">Previous payments visible in your fee history.</div>
        </BentoCard>
      </div>
    </PageShell>
  );
}

function Mini({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-gray-100 p-2 dark:border-white/10">
      <Icon className={`mx-auto h-5 w-5 ${tone}`} />
      <div className="mt-1 text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}
