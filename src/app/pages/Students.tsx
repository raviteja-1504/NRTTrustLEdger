import { Link, useNavigate } from "react-router";
import BentoCard from "../components/BentoCard";
import { Users, UserPlus, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormModal, { Field, inputClass } from "../components/FormModal";
import { Can } from "../../lib/auth/Can";
import { studentsService, classSectionsService } from "../../lib/services/students.service";
import type { ApiClassSection } from "../../lib/services/types";

const GRADE_COLORS = [
  "#E3F2FD","#E8F5E9","#FFF3E0","#F3E5F5","#E0F2F1",
  "#FCE4EC","#E1F5FE","#F1F8E9","#FFF8E1","#EDE7F6","#E0F7FA","#F9FBE7",
];

interface GradeGroup {
  grade: number;
  sections: ApiClassSection[];
  color: string;
}

const makeBlankStudent = (sections: ApiClassSection[]) => ({
  name: "",
  grade: sections.length > 0 ? String(sections[0].grade) : "1",
  section: sections.length > 0 ? sections[0].section : "A",
  class_section_id: sections.length > 0 ? sections[0].id : "",
  rollNo: "",
  dob: "",
  gender: "Male",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
});

export default function Students() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<ApiClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => makeBlankStudent([]));

  useEffect(() => {
    Promise.all([
      classSectionsService.list().catch(() => null),
      studentsService.list({ page_size: 1 }).catch(() => null),
    ]).then(([secs, stus]) => {
      const list = secs?.data ?? [];
      setSections(list);
      setStudentCount(stus?.meta.total ?? 0);
      setDraft(makeBlankStudent(list));
    }).finally(() => setLoading(false));
  }, []);

  const gradeGroups: GradeGroup[] = (() => {
    const map = new Map<number, ApiClassSection[]>();
    sections.forEach((s) => {
      const existing = map.get(s.grade) ?? [];
      map.set(s.grade, [...existing, s]);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([grade, secs], i) => ({ grade, sections: secs, color: GRADE_COLORS[i % GRADE_COLORS.length] }));
  })();

  const sectionsForGrade = (grade: string) =>
    sections.filter((s) => String(s.grade) === grade);

  const handleCreate = async () => {
    if (!draft.class_section_id) { toast.error("Select a class section"); return; }
    setSaving(true);
    try {
      const admNo = `ADM-${Date.now().toString().slice(-6)}`;
      await studentsService.create({
        admission_no: admNo,
        name: draft.name.trim(),
        gender: draft.gender,
        dob: draft.dob || undefined,
        class_section_id: draft.class_section_id,
        academic_year: sections.find((s) => s.id === draft.class_section_id)?.academic_year,
      });
      toast.success(`${draft.name} admitted (${admNo})`);
      setOpen(false);
      setDraft(makeBlankStudent(sections));
      const gradeInt = parseInt(draft.grade, 10);
      navigate(`/students/${gradeInt}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create student");
    } finally {
      setSaving(false);
    }
  };

  const updateGrade = (grade: string) => {
    const gradeSecions = sectionsForGrade(grade);
    const firstSection = gradeSecions[0];
    setDraft({
      ...draft,
      grade,
      section: firstSection?.section ?? "A",
      class_section_id: firstSection?.id ?? "",
    });
  };

  const updateSection = (sectionId: string) => {
    const sec = sections.find((s) => s.id === sectionId);
    setDraft({ ...draft, class_section_id: sectionId, section: sec?.section ?? "" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 bg-[#FAFAFA] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Student Information System</h1>
        <p className="text-gray-600">Select a grade to view class rosters and student profiles</p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <BentoCard className="max-w-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#00897B] rounded-xl flex items-center justify-center shadow-sm">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Students</p>
              <p className="text-3xl font-bold text-[#1A237E]">{loading ? "—" : studentCount}</p>
            </div>
          </div>
        </BentoCard>
        <Can permission="students.write">
          <button
            onClick={() => setOpen(true)}
            disabled={sections.length === 0}
            title={sections.length === 0 ? "Create class sections in Settings first" : undefined}
            className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#283593] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="h-4 w-4" /> Add Student
          </button>
        </Can>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading classes…
        </div>
      ) : gradeGroups.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No class sections yet</h3>
            <p className="text-sm text-gray-400 max-w-sm">Go to Settings → Class Sections to create grades and sections. Students can then be enrolled into them.</p>
          </div>
        </BentoCard>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {gradeGroups.map((gradeData, i) => (
            <motion.div key={gradeData.grade} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/students/${gradeData.grade}`} className="block transform hover:-translate-y-2 transition-transform duration-300">
                <div className="h-full cursor-pointer hover:shadow-lg border-none rounded-xl p-6" style={{ backgroundColor: gradeData.color }}>
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-4xl font-bold text-[#1A237E]">{gradeData.grade}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#1A237E] mb-2">Grade {gradeData.grade}</h2>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <div className="flex flex-wrap justify-center gap-1">
                        {gradeData.sections.map((s) => (
                          <span key={s.id} className="px-2 py-1 bg-white/60 text-[#1A237E] text-xs font-semibold rounded-md shadow-sm">{s.section}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      <FormModal
        open={open}
        onClose={() => { setOpen(false); setDraft(makeBlankStudent(sections)); }}
        title="Add New Student"
        subtitle="Creates a student record and enrols them into the selected class section."
        submitLabel={saving ? "Saving…" : "Admit Student"}
        size="lg"
        onSubmit={handleCreate}
        submitDisabled={saving || !draft.name.trim() || !draft.class_section_id}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Student</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required>
            <input className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
          </Field>
          <Field label="Date of Birth">
            <input type="date" className={inputClass} value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
          </Field>
          <Field label="Grade" required>
            <select className={inputClass} value={draft.grade} onChange={(e) => updateGrade(e.target.value)}>
              {gradeGroups.map((g) => <option key={g.grade} value={String(g.grade)}>Grade {g.grade}</option>)}
            </select>
          </Field>
          <Field label="Section" required>
            <select className={inputClass} value={draft.class_section_id} onChange={(e) => updateSection(e.target.value)}>
              {sectionsForGrade(draft.grade).map((s) => <option key={s.id} value={s.id}>Section {s.section}</option>)}
            </select>
          </Field>
          <Field label="Gender">
            <select className={inputClass} value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })}>
              {["Male","Female","Other"].map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Roll No.">
            <input type="number" min={1} className={inputClass} value={draft.rollNo} onChange={(e) => setDraft({ ...draft, rollNo: e.target.value })} />
          </Field>
        </div>

        <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Parent / Guardian</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Parent Name">
            <input className={inputClass} value={draft.parentName} onChange={(e) => setDraft({ ...draft, parentName: e.target.value })} />
          </Field>
          <Field label="Parent Phone">
            <input className={inputClass} value={draft.parentPhone} onChange={(e) => setDraft({ ...draft, parentPhone: e.target.value })} />
          </Field>
          <Field label="Parent Email">
            <input type="email" className={inputClass} value={draft.parentEmail} onChange={(e) => setDraft({ ...draft, parentEmail: e.target.value })} />
          </Field>
        </div>
      </FormModal>
    </motion.div>
  );
}
