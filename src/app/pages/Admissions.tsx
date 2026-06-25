import { useState, useEffect } from "react";
import BentoCard from "../components/BentoCard";
import { Plus, Filter, Phone, Star, X, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import FormModal, { Field, inputClass } from "../components/FormModal";
import { admissionsService } from "../../lib/services/admissions.service";
import { classSectionsService } from "../../lib/services/students.service";
import type { ApiAdmissionLead, ApiClassSection } from "../../lib/services/types";

const COLUMNS = [
  { id: 'inquiry', title: 'Inquiry', color: '#E3F2FD' },
  { id: 'application', title: 'Application', color: '#FFF3E0' },
  { id: 'visit', title: 'Campus Visit', color: '#F3E5F5' },
  { id: 'test', title: 'Entrance Test', color: '#E8F5E9' },
  { id: 'enrolled', title: 'Enrolled', color: '#E0F2F1' },
];

const DROP_REASONS = ["Not Interested", "Enrolled Elsewhere", "Fee Concerns", "Relocated", "No Response", "Other"];

const blankLead = {
  student_name: "",
  parent_name: "",
  parent_phone: "",
  parent_email: "",
  grade_applying_for: 6,
  source: "Website",
  strength: 3,
  notes: "",
};

export default function Admissions() {
  const [leads, setLeads] = useState<ApiAdmissionLead[]>([]);
  const [sections, setSections] = useState<ApiClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState<number | 'all'>('all');
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(blankLead);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [pendingEnrollId, setPendingEnrollId] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState({ admissionNo: '', class_section_id: '', parent_email: '' });

  useEffect(() => {
    Promise.all([
      admissionsService.list({ page_size: 200 }).catch(() => null),
      classSectionsService.list().catch(() => null),
    ]).then(([leadsRes, secsRes]) => {
      setLeads(leadsRes?.data ?? []);
      setSections(secsRes?.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const activeLeads = leads.filter((l) => l.stage !== 'dropped');
  const droppedLeads = leads.filter((l) => l.stage === 'dropped');
  const filteredLeads = filterGrade === 'all'
    ? activeLeads
    : activeLeads.filter(lead => lead.grade_applying_for === filterGrade);

  const handleStatusChange = async (leadId: string, newStage: string) => {
    if (newStage === 'enrolled') {
      const lead = leads.find((l) => l.id === leadId);
      if (lead && lead.stage !== 'enrolled') {
        setPendingEnrollId(leadId);
        setEnrollForm({ admissionNo: `ADM-${Date.now().toString().slice(-6)}`, class_section_id: '', parent_email: lead.parent_email || '' });
        setEnrollModalOpen(true);
        return;
      }
    }
    try {
      await admissionsService.update(leadId, { stage: newStage });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage as any } : l)));
      toast.success(`Lead moved to ${newStage}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update lead");
    }
  };

  const handleDropLead = async (leadId: string, reason: string) => {
    try {
      await admissionsService.update(leadId, { stage: 'dropped', drop_reason: reason });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: 'dropped' as any, drop_reason: reason } : l)));
      const lead = leads.find((l) => l.id === leadId);
      toast.success(`Lead "${lead?.student_name}" dropped — ${reason}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to drop lead");
    }
  };

  const handleCreateLead = async () => {
    setSaving(true);
    try {
      await admissionsService.create({
        parent_name: draft.parent_name.trim(),
        parent_phone: draft.parent_phone.trim(),
        parent_email: draft.parent_email.trim() || undefined,
        student_name: draft.student_name.trim(),
        grade_applying_for: draft.grade_applying_for,
        source: draft.source,
        strength: draft.strength,
        notes: draft.notes.trim() || undefined,
      });
      toast.success(`Lead "${draft.student_name}" added to Inquiry`);
      setDraft(blankLead);
      setNewLeadOpen(false);
      admissionsService.list({ page_size: 200 }).then((res) => setLeads(res.data));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmEnrollment = async () => {
    if (!pendingEnrollId || !enrollForm.class_section_id) return;
    setSaving(true);
    try {
      const lead = leads.find((l) => l.id === pendingEnrollId);
      if (!lead) return;
      await admissionsService.enroll(pendingEnrollId, {
        class_section_id: enrollForm.class_section_id,
        academic_year: sections.find((s) => s.id === enrollForm.class_section_id)?.academic_year || '',
        admission_no: enrollForm.admissionNo,
        parent_email: enrollForm.parent_email || undefined,
      });
      toast.success(`${lead.student_name} enrolled as ${enrollForm.admissionNo}`);
      setEnrollModalOpen(false);
      setPendingEnrollId(null);
      admissionsService.list({ page_size: 200 }).then((res) => setLeads(res.data));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to enroll");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-[#FAFAFA] min-h-screen">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Admissions Management</h1>
          <p className="text-gray-600">Track and manage your admission pipeline</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00897B]"
            >
              <option value="all">All Grades</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <button
            onClick={() => setNewLeadOpen(true)}
            className="flex items-center gap-2 bg-[#00897B] text-white px-6 py-3 rounded-lg hover:bg-[#00796B] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Lead</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading leads…
        </div>
      ) : filteredLeads.length === 0 && droppedLeads.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No admission leads yet. Add a lead to start tracking your admissions pipeline.</p>
          </div>
        </BentoCard>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-4 mb-8">
            {COLUMNS.map((column) => {
              const count = filteredLeads.filter(lead => lead.stage === column.id).length;
              return (
                <BentoCard key={column.id} className="text-center">
                  <div className="text-3xl font-bold text-[#1A237E]">{count}</div>
                  <div className="text-sm text-gray-600 mt-1">{column.title}</div>
                </BentoCard>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {COLUMNS.map((column) => (
              <div key={column.id}>
                <div className="rounded-t-xl p-4 mb-4" style={{ backgroundColor: column.color }}>
                  <h2 className="font-semibold text-[#1A237E] flex items-center justify-between">
                    <span>{column.title}</span>
                    <span className="bg-white text-[#1A237E] px-3 py-1 rounded-full text-sm">
                      {filteredLeads.filter((lead) => lead.stage === column.id).length}
                    </span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {filteredLeads.filter((lead) => lead.stage === column.id).map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} onDropLead={handleDropLead} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {droppedLeads.length > 0 && (
            <BentoCard className="mt-6">
              <h2 className="text-lg font-semibold text-[#1A237E] mb-3">Dropped Leads ({droppedLeads.length})</h2>
              <div className="space-y-2">
                {droppedLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2 text-sm">
                    <span className="font-medium text-gray-700">{lead.student_name}</span>
                    <span className="text-gray-500">Grade {lead.grade_applying_for}</span>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-600">{lead.drop_reason}</span>
                  </div>
                ))}
              </div>
            </BentoCard>
          )}
        </>
      )}

      <FormModal
        open={enrollModalOpen}
        onClose={() => { setEnrollModalOpen(false); setPendingEnrollId(null); }}
        title="Confirm Enrollment"
        subtitle={pendingEnrollId ? `Enrolling ${leads.find(l => l.id === pendingEnrollId)?.student_name}` : ''}
        submitLabel={saving ? "Enrolling…" : "Enroll & Create Student"}
        onSubmit={handleConfirmEnrollment}
        submitDisabled={saving || !enrollForm.admissionNo.trim() || !enrollForm.class_section_id}
      >
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-2 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-800">This will create a student record and guardian membership.</p>
        </div>
        <Field label="Admission Number" required>
          <input className={inputClass} placeholder="ADM-001234" value={enrollForm.admissionNo} onChange={(e) => setEnrollForm({ ...enrollForm, admissionNo: e.target.value })} required />
        </Field>
        <Field label="Class Section" required>
          <select className={inputClass} value={enrollForm.class_section_id} onChange={(e) => setEnrollForm({ ...enrollForm, class_section_id: e.target.value })}>
            <option value="">Select section</option>
            {sections.map((s) => <option key={s.id} value={s.id}>Grade {s.grade} - {s.section}</option>)}
          </select>
        </Field>
        <Field label="Parent Email">
          <input className={inputClass} type="email" placeholder="parent@example.com" value={enrollForm.parent_email} onChange={(e) => setEnrollForm({ ...enrollForm, parent_email: e.target.value })} />
        </Field>
      </FormModal>

      <FormModal
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        title="Add New Lead"
        subtitle="Capture a prospective student inquiry"
        submitLabel={saving ? "Adding…" : "Add Lead"}
        onSubmit={handleCreateLead}
        submitDisabled={saving || !draft.student_name.trim() || !draft.parent_name.trim() || !draft.parent_phone.trim()}
      >
        <Field label="Student Name" required>
          <input className={inputClass} placeholder="e.g. Simran Kaur" value={draft.student_name} onChange={(e) => setDraft({ ...draft, student_name: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Grade Applying For" required>
            <select className={inputClass} value={draft.grade_applying_for} onChange={(e) => setDraft({ ...draft, grade_applying_for: Number(e.target.value) })}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </Field>
          <Field label="Lead Strength">
            <select className={inputClass} value={draft.strength} onChange={(e) => setDraft({ ...draft, strength: Number(e.target.value) })}>
              {[1,2,3,4,5].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
            </select>
          </Field>
        </div>
        <Field label="Parent Name" required>
          <input className={inputClass} placeholder="Parent name" value={draft.parent_name} onChange={(e) => setDraft({ ...draft, parent_name: e.target.value })} required />
        </Field>
        <Field label="Parent Phone" required>
          <input className={inputClass} placeholder="+91 98765-43210" value={draft.parent_phone} onChange={(e) => setDraft({ ...draft, parent_phone: e.target.value })} required />
        </Field>
        <Field label="Parent Email">
          <input className={inputClass} type="email" placeholder="parent@example.com" value={draft.parent_email} onChange={(e) => setDraft({ ...draft, parent_email: e.target.value })} />
        </Field>
        <Field label="Source">
          <select className={inputClass} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })}>
            {["Website","Walk-in","Referral","Social Media","Advertisement","Other"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} placeholder="Additional notes..." value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
        </Field>
      </FormModal>
    </motion.div>
  );
}

function LeadCard({ lead, onStatusChange, onDropLead }: { lead: ApiAdmissionLead; onStatusChange: (id: string, stage: string) => void; onDropLead: (id: string, reason: string) => void }) {
  const [showDropMenu, setShowDropMenu] = useState(false);
  const stages = ['inquiry','application','visit','test','enrolled'] as const;
  const currentIdx = stages.indexOf(lead.stage as any);
  const nextStage = stages[currentIdx + 1];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-[#1A237E]">{lead.student_name}</h3>
          <p className="text-sm text-gray-600">Grade {lead.grade_applying_for}</p>
        </div>
        {lead.stage !== 'enrolled' && (
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowDropMenu(!showDropMenu); }} className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50">
              <X className="w-4 h-4" />
            </button>
            {showDropMenu && (
              <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase">Drop Reason</p>
                {DROP_REASONS.map((reason) => (
                  <button key={reason} onClick={(e) => { e.stopPropagation(); onDropLead(lead.id, reason); setShowDropMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-red-50 hover:text-red-600">
                    {reason}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
        <Phone className="w-4 h-4" />
        <span>{lead.parent_phone}</span>
        <a href={`https://wa.me/${lead.parent_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-green-600 hover:underline text-xs">WhatsApp</a>
      </div>
      <div className="flex items-center gap-1 mb-2">
        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < (lead.strength ?? 3) ? 'fill-[#FF9800] text-[#FF9800]' : 'text-gray-300'}`} />)}
      </div>
      {nextStage && (
        <button onClick={() => onStatusChange(lead.id, nextStage)} className="w-full text-xs bg-[#00897B] text-white py-1.5 rounded-md hover:bg-[#00796B]">
          Move to {nextStage}
        </button>
      )}
    </div>
  );
}
