import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Eye, EyeOff, Mail, Pencil, Phone, Search, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import FormModal, { Field, inputClass } from "../components/FormModal";
import { Can } from "../../lib/auth/Can";
import { staffService } from "../../lib/services/staff.service";
import type { ApiStaff } from "../../lib/services/types";

const deptColors: Record<string, string> = {
  Academics:  "bg-indigo-50 text-indigo-700",
  Finance:    "bg-emerald-50 text-emerald-700",
  Sports:     "bg-amber-50 text-amber-700",
  Library:    "bg-rose-50 text-rose-700",
  Admissions: "bg-sky-50 text-sky-700",
  Operations: "bg-violet-50 text-violet-700",
  Admin:      "bg-gray-50 text-gray-700",
};

const blankStaff = {
  membership_id: "",
  department: "",
  designation: "",
  salary: "",
};

export default function Staff() {
  const [list, setList] = useState<ApiStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(blankStaff);
  const [visibleSalaryIds, setVisibleSalaryIds] = useState<string[]>([]);

  useEffect(() => {
    staffService.list({ page_size: 200 })
      .then((res) => setList(res.data))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const depts = ["All", ...Array.from(new Set((list || []).map((s) => s.department || "Admin").filter(Boolean)))];
  const filtered = (list || []).filter((s) =>
    (dept === "All" || s.department === dept) &&
    (s.name + s.email + (s.designation || "")).toLowerCase().includes(q.toLowerCase())
  );

  const openCreateStaff = () => {
    setDraft(blankStaff);
    setOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await staffService.create({
        membership_id: draft.membership_id,
        employee_code: draft.membership_id,
        department: draft.department || undefined,
        designation: draft.designation || undefined,
        salary: draft.salary ? Number(draft.salary) : undefined,
      });
      toast.success("Staff member added");
      setOpen(false);
      setDraft(blankStaff);
      staffService.list({ page_size: 200 }).then((res) => setList(res.data));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create staff");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Staff Directory"
        subtitle="Teachers, administrators, and support staff"
        actions={
          <Can permission="staff.write">
            <button onClick={openCreateStaff} className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
              <UserPlus className="h-4 w-4" /> Add Staff
            </button>
          </Can>
        }
      />

      <BentoCard className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" className="flex-1 bg-transparent outline-none" />
          </div>
          <div className="flex flex-wrap gap-1">
            {depts.map((d) => (
              <button key={d} onClick={() => setDept(d)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${dept === d ? "bg-[#1A237E] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{d}</button>
            ))}
          </div>
        </div>
      </BentoCard>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading staff…
        </div>
      ) : filtered.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No staff members found. Add staff via the Memberships module first, then create staff records here.</p>
          </div>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <BentoCard>
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1A237E] to-[#00897B] text-sm font-semibold text-white">
                    {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#1A237E]">{s.name}</div>
                    <div className="truncate text-xs text-gray-600">{s.designation || s.role}</div>
                  </div>
                </div>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${deptColors[s.department || "Admin"] ?? "bg-gray-100 text-gray-700"}`}>{s.department || "Admin"}</span>
                <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span className="truncate">{s.email}</span></div>
                  {s.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>{s.phone}</span></div>}
                </div>
                {s.salary && (
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-500">Salary</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1A237E]">
                        {visibleSalaryIds.includes(s.id) ? `₹${s.salary.toLocaleString("en-IN")}` : "Private"}
                      </span>
                      <button onClick={() => setVisibleSalaryIds((ids) => ids.includes(s.id) ? ids.filter((id) => id !== s.id) : [...ids, s.id])} className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-[#1A237E]">
                        {visibleSalaryIds.includes(s.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </BentoCard>
            </motion.div>
          ))}
        </div>
      )}

      <FormModal
        open={open}
        onClose={() => { setOpen(false); setDraft(blankStaff); }}
        title="Add Staff Member"
        subtitle="Link a membership to a staff record with department and designation"
        submitLabel={saving ? "Adding…" : "Add Staff"}
        size="md"
        onSubmit={handleSubmit}
        submitDisabled={saving || !draft.membership_id.trim()}
      >
        <Field label="Membership ID" required hint="Create membership in Settings first">
          <input className={inputClass} value={draft.membership_id} onChange={(e) => setDraft({ ...draft, membership_id: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <select className={inputClass} value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })}>
              <option value="">Select</option>
              {["Academics","Finance","Admissions","Sports","Library","Operations"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation">
            <input className={inputClass} placeholder="e.g. Teacher" value={draft.designation} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} />
          </Field>
        </div>
        <Field label="Monthly Salary (₹)">
          <input type="number" min={0} className={inputClass} placeholder="60000" value={draft.salary} onChange={(e) => setDraft({ ...draft, salary: e.target.value })} />
        </Field>
      </FormModal>
    </PageShell>
  );
}
