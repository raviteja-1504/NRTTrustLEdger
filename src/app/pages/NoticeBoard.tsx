import { motion } from "motion/react";
import { Megaphone, Paperclip, Eye, Pin } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";

interface Notice {
  id: string; title: string; body: string; audience: string;
  postedBy: string; postedAt: string; pinned?: boolean;
  attachment?: string; readBy: number; total: number;
}

const notices: Notice[] = [
  { id: "1", title: "Annual Day — dress rehearsal on Friday", body: "All performers must report to the auditorium at 2 PM. Costumes will be distributed.", audience: "Students Gr 6–10", postedBy: "Principal", postedAt: "2h ago", pinned: true, attachment: "Rehearsal-schedule.pdf", readBy: 312, total: 420 },
  { id: "2", title: "Parent-Teacher Meeting — Saturday 10 AM", body: "Term 2 progress reports will be discussed. Please confirm your time slot.", audience: "All Parents", postedBy: "Academic Coordinator", postedAt: "1 day ago", readBy: 890, total: 1200 },
  { id: "3", title: "Library closed for stock audit — Mon/Tue", body: "The library will resume normal operations from Wednesday.", audience: "All", postedBy: "Librarian", postedAt: "2 days ago", readBy: 1050, total: 1350 },
  { id: "4", title: "Science exhibition winners announced",  body: "Congratulations to Gr 9-A for bagging the inter-school trophy!", audience: "All", postedBy: "Principal", postedAt: "3 days ago", attachment: "Winners.pdf", readBy: 1310, total: 1350 },
];

export default function NoticeBoard() {
  return (
    <PageShell>
      <PageHeader
        title="Notice Board"
        subtitle="Circulars, announcements, and attachments with read receipts"
        actions={
          <Can permission="notices.write">
            <button className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
              <Megaphone className="h-4 w-4" /> Post Notice
            </button>
          </Can>
        }
      />

      <div className="space-y-4">
        {notices.map((n, i) => {
          const pct = Math.round((n.readBy / n.total) * 100);
          return (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <BentoCard>
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${n.pinned ? "bg-amber-100 text-amber-700" : "bg-indigo-50 text-indigo-600"}`}>
                    {n.pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#1A237E] dark:text-white">{n.title}</h3>
                      {n.pinned && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Pinned</span>}
                      <span className="ml-auto text-xs text-gray-500">{n.postedAt}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{n.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-white/10">👥 {n.audience}</span>
                      <span>by <span className="font-medium text-gray-700 dark:text-gray-300">{n.postedBy}</span></span>
                      {n.attachment && (
                        <span className="flex items-center gap-1 text-[#00897B]">
                          <Paperclip className="h-3 w-3" /> {n.attachment}
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5" />
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#00897B] to-[#1A237E]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{pct}% read</span>
                      </div>
                    </div>
                  </div>
                </div>
              </BentoCard>
            </motion.div>
          );
        })}
      </div>
    </PageShell>
  );
}
