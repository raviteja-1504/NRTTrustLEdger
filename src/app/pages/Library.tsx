import { useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";

interface Book {
  id: string; title: string; author: string; isbn: string;
  total: number; available: number; category: string;
}

const catalog: Book[] = [
  { id: "b1", title: "Wings of Fire",          author: "A.P.J. Abdul Kalam", isbn: "978-8173711466", total: 8, available: 3, category: "Biography" },
  { id: "b2", title: "To Kill a Mockingbird",   author: "Harper Lee",         isbn: "978-0061120084", total: 6, available: 0, category: "Fiction" },
  { id: "b3", title: "Physics NCERT XI",        author: "NCERT",              isbn: "978-8174506894", total: 24, available: 14, category: "Textbook" },
  { id: "b4", title: "A Brief History of Time", author: "Stephen Hawking",    isbn: "978-0553380163", total: 4, available: 1, category: "Science" },
  { id: "b5", title: "Panchatantra Tales",      author: "Vishnu Sharma",      isbn: "978-8174766014", total: 10, available: 6, category: "Children" },
  { id: "b6", title: "Harry Potter Vol.1",      author: "J.K. Rowling",       isbn: "978-0747532699", total: 12, available: 2, category: "Fiction" },
];

const issued = [
  { student: "Aarav Mehta",  book: "Wings of Fire", dueIn: 2,  overdue: false },
  { student: "Diya Sharma",  book: "Harry Potter Vol.1", dueIn: 5, overdue: false },
  { student: "Kabir Khan",   book: "To Kill a Mockingbird", dueIn: -3, overdue: true },
  { student: "Isha Patel",   book: "A Brief History of Time", dueIn: -1, overdue: true },
  { student: "Rohan Das",    book: "Panchatantra Tales", dueIn: 7, overdue: false },
];

export default function Library() {
  const [q, setQ] = useState("");
  const filtered = catalog.filter((b) => (b.title + b.author + b.category).toLowerCase().includes(q.toLowerCase()));
  const overdue = issued.filter((i) => i.overdue).length;

  return (
    <PageShell>
      <PageHeader
        title="Library"
        subtitle="Catalogue, issue/return tracking, and overdue management"
        actions={
          <Can permission="library.write">
            <button className="rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">+ Add Book</button>
          </Can>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat icon={BookOpen} tone="bg-indigo-50 text-indigo-600" label="Titles" value={String(catalog.length)} />
        <Stat icon={CheckCircle2} tone="bg-emerald-50 text-emerald-600" label="Available" value={String(catalog.reduce((a, b) => a + b.available, 0))} />
        <Stat icon={BookOpen} tone="bg-amber-50 text-amber-600" label="Issued" value={String(catalog.reduce((a, b) => a + (b.total - b.available), 0))} />
        <Stat icon={AlertTriangle} tone="bg-rose-50 text-rose-600" label="Overdue" value={String(overdue)} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <BentoCard padding={false} className="col-span-12 lg:col-span-8">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-white/10">
            <h2 className="text-lg font-semibold text-[#1A237E] dark:text-white">Catalogue</h2>
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5">
              <Search className="h-4 w-4 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, author…" className="w-56 bg-transparent outline-none" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                {["Title","Author","Category","Stock"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filtered.map((b, i) => (
                <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{b.title}</td>
                  <td className="px-4 py-3 text-gray-600">{b.author}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{b.category}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                        <div className={`h-full rounded-full ${b.available === 0 ? "bg-red-400" : "bg-emerald-500"}`} style={{ width: `${(b.available / b.total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{b.available}/{b.total}</span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-4">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Issued — due soon</h2>
          <div className="space-y-3">
            {issued.map((it, i) => (
              <div key={i} className={`rounded-lg border p-3 ${it.overdue ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/5" : "border-gray-100 dark:border-white/10"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-800 dark:text-gray-100">{it.student}</div>
                  <span className={`text-xs font-medium ${it.overdue ? "text-red-600" : "text-gray-500"}`}>
                    {it.overdue ? `${Math.abs(it.dueIn)}d overdue` : `${it.dueIn}d left`}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-500">{it.book}</div>
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </PageShell>
  );
}

function Stat({ icon: Icon, tone, label, value }: { icon: any; tone: string; label: string; value: string }) {
  return (
    <BentoCard>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-xl font-semibold text-[#1A237E] dark:text-white">{value}</div>
        </div>
      </div>
    </BentoCard>
  );
}
