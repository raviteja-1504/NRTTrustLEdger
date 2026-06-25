import { motion } from "motion/react";
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Download, Users, TrendingUp, DollarSign, BookOpen } from "lucide-react";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";

const enrollmentYoY = [
  { year: "2022", students: 980 },
  { year: "2023", students: 1080 },
  { year: "2024", students: 1175 },
  { year: "2025", students: 1260 },
  { year: "2026", students: 1342 },
];
const revenueTrend = [
  { m: "Apr", v: 420 }, { m: "May", v: 465 }, { m: "Jun", v: 475 },
  { m: "Jul", v: 485 }, { m: "Aug", v: 500 }, { m: "Sep", v: 495 },
];
const gradeDist = [
  { name: "Gr 1-5",  value: 420, color: "#1A237E" },
  { name: "Gr 6-8",  value: 380, color: "#00897B" },
  { name: "Gr 9-10", value: 310, color: "#FF9800" },
  { name: "Gr 11-12", value: 232, color: "#EF5350" },
];
const performance = [
  { subject: "Math",    avg: 76 },
  { subject: "Science", avg: 81 },
  { subject: "English", avg: 73 },
  { subject: "Social",  avg: 78 },
  { subject: "Hindi",   avg: 84 },
];

export default function Reports() {
  return (
    <PageShell>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Year-over-year trends, grade distribution, and subject performance"
        actions={
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
            <Download className="h-4 w-4" /> Export Excel
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={Users}       tone="indigo" label="Enrolled"       value="1,342" delta="+6.5%" />
        <Kpi icon={DollarSign}  tone="emerald" label="YTD Collected"  value="₹52.4L" delta="+12.5%" />
        <Kpi icon={TrendingUp}  tone="amber"  label="Conversion"     value="29.7%" delta="+3.2%" />
        <Kpi icon={BookOpen}    tone="rose"   label="Avg Attendance" value="93%"   delta="+1.1%" />
      </div>

      <div className="grid grid-cols-12 gap-6">
        <BentoCard className="col-span-12 lg:col-span-8">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Enrollment — Year over Year</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={enrollmentYoY}>
              <defs>
                <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00897B" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00897B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="year" stroke="#616161" />
              <YAxis stroke="#616161" />
              <Tooltip />
              <Area dataKey="students" stroke="#00897B" strokeWidth={2.5} fill="url(#gArea)" />
            </AreaChart>
          </ResponsiveContainer>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-4">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Grade Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={gradeDist} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
                {gradeDist.map((g) => <Cell key={g.name} fill={g.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {gradeDist.map((g) => (
              <div key={g.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{g.name}</span>
                <span className="font-semibold text-[#1A237E] dark:text-white">{g.value}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Revenue Trend (₹ in thousands)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="m" stroke="#616161" />
              <YAxis stroke="#616161" />
              <Tooltip />
              <Line type="monotone" dataKey="v" stroke="#1A237E" strokeWidth={3} dot={{ r: 4, fill: "#00897B" }} />
            </LineChart>
          </ResponsiveContainer>
        </BentoCard>

        <BentoCard className="col-span-12 lg:col-span-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1A237E] dark:text-white">Avg Score by Subject</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={performance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis type="number" domain={[0, 100]} stroke="#616161" />
              <YAxis dataKey="subject" type="category" stroke="#616161" width={70} />
              <Tooltip />
              <Bar dataKey="avg" fill="#00897B" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </BentoCard>
      </div>
    </PageShell>
  );
}

function Kpi({ icon: Icon, tone, label, value, delta }: { icon: any; tone: "indigo"|"emerald"|"amber"|"rose"; label: string; value: string; delta: string }) {
  const tones = {
    indigo:  "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    rose:    "bg-rose-50 text-rose-600",
  } as const;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <BentoCard>
        <div className="flex items-start justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{delta}</span>
        </div>
        <div className="mt-4 text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold text-[#1A237E] dark:text-white">{value}</div>
      </BentoCard>
    </motion.div>
  );
}
