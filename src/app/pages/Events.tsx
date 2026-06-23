import { useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";

interface Event { id: string; date: number; title: string; type: "Event" | "Holiday" | "Exam" | "PTM"; time?: string; location?: string; }

const EVENTS: Event[] = [
  { id: "1", date: 5,  title: "Foundation Day",         type: "Event",   time: "09:00 AM", location: "Main Auditorium" },
  { id: "2", date: 12, title: "Gandhi Jayanti",         type: "Holiday" },
  { id: "3", date: 15, title: "Mid-Term — Math",        type: "Exam",    time: "09:30 AM" },
  { id: "4", date: 18, title: "PTM — Gr 6 to 10",       type: "PTM",     time: "10:00 AM", location: "Respective classrooms" },
  { id: "5", date: 22, title: "Sports Day",             type: "Event",   time: "08:00 AM", location: "Sports ground" },
  { id: "6", date: 28, title: "Diwali Break begins",    type: "Holiday" },
];

const typeColor: Record<Event["type"], string> = {
  Event:   "bg-indigo-500",
  Holiday: "bg-emerald-500",
  Exam:    "bg-red-500",
  PTM:     "bg-amber-500",
};
const typeBg: Record<Event["type"], string> = {
  Event:   "bg-indigo-50 text-indigo-700",
  Holiday: "bg-emerald-50 text-emerald-700",
  Exam:    "bg-red-50 text-red-700",
  PTM:     "bg-amber-50 text-amber-700",
};

export default function Events() {
  const [month] = useState("October 2026");
  const daysInMonth = 31;
  const firstDow = 3; // Wed

  return (
    <PageShell>
      <PageHeader
        title="Events & Calendar"
        subtitle="School events, exams, PTMs, and holidays — single source of truth"
        actions={
          <Can permission="events.write">
            <button className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
              <Plus className="h-4 w-4" /> New Event
            </button>
          </Can>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        <BentoCard className="col-span-12 lg:col-span-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1A237E] dark:text-white">{month}</h2>
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-gray-400">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const evs = EVENTS.filter((e) => e.date === day);
              return (
                <motion.div key={day} whileHover={{ scale: 1.02 }} className="min-h-[84px] rounded-lg border border-gray-100 p-1.5 text-left dark:border-white/10">
                  <div className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-300">{day}</div>
                  <div className="space-y-1">
                    {evs.map((e) => (
                      <div key={e.id} className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white ${typeColor[e.type]}`}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-4">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Upcoming</h2>
          <div className="space-y-3">
            {EVENTS.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex gap-3 rounded-lg border border-gray-100 p-3 transition hover:border-[#00897B]/40 dark:border-white/10">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gray-50 dark:bg-white/5">
                  <span className="text-xs font-medium text-gray-500">OCT</span>
                  <span className="text-lg font-semibold text-[#1A237E] dark:text-white">{e.date}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeBg[e.type]}`}>{e.type}</span>
                  </div>
                  <div className="mt-0.5 truncate font-medium text-gray-800 dark:text-gray-100">{e.title}</div>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                    {e.time     && <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{e.time}</div>}
                    {e.location && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</div>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </BentoCard>
      </div>
    </PageShell>
  );
}
