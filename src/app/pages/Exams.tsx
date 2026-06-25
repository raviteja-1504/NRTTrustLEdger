import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileDown, Plus, Award, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import PageHeader, { PageShell } from "../components/PageHeader";
import BentoCard from "../components/BentoCard";
import { Can } from "../../lib/auth/Can";
import { examsService } from "../../lib/services/exams.service";
import { classSectionsService, studentsService } from "../../lib/services/students.service";
import type { ApiExamTerm, ApiExam, ApiMark, ApiStudent, ApiClassSection } from "../../lib/services/types";

function grade(marks: number, max: number): { letter: string; color: string } {
  const pct = (marks / max) * 100;
  if (pct >= 90) return { letter: "A+", color: "bg-emerald-100 text-emerald-700" };
  if (pct >= 80) return { letter: "A",  color: "bg-green-100 text-green-700" };
  if (pct >= 70) return { letter: "B",  color: "bg-sky-100 text-sky-700" };
  if (pct >= 60) return { letter: "C",  color: "bg-amber-100 text-amber-700" };
  if (pct >= 40) return { letter: "D",  color: "bg-orange-100 text-orange-700" };
  return { letter: "F", color: "bg-red-100 text-red-700" };
}

export default function Exams() {
  const [terms, setTerms] = useState<ApiExamTerm[]>([]);
  const [sections, setSections] = useState<ApiClassSection[]>([]);
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [marks, setMarks] = useState<Record<string, ApiMark>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  useEffect(() => {
    Promise.all([
      examsService.listTerms().catch(() => null),
      classSectionsService.list().catch(() => null),
    ]).then(([termsRes, secsRes]) => {
      if (termsRes) setTerms(termsRes.data);
      if (secsRes) setSections(secsRes.data);
      if (termsRes?.data.length) setSelectedTermId(termsRes.data[0].id);
      if (secsRes?.data.length) setSelectedSectionId(secsRes.data[0].id);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTermId || !selectedSectionId) return;
    setLoading(true);
    Promise.all([
      examsService.listExams({ term_id: selectedTermId, class_section_id: selectedSectionId }).catch(() => null),
      studentsService.list({ class_section_id: selectedSectionId, page_size: 200 }).catch(() => null),
    ]).then(([examsRes, stuRes]) => {
      if (examsRes) setExams(examsRes.data);
      if (stuRes) setStudents(stuRes.data);
    }).finally(() => setLoading(false));
  }, [selectedTermId, selectedSectionId]);

  const selectedTerm = terms.find((t) => t.id === selectedTermId);
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  const handleSave = async () => {
    const marksArray = Object.values(marks);
    if (marksArray.length === 0) return toast.error("No marks to save");
    toast.success("Marks saved (stub - implement API call)");
  };

  return (
    <PageShell>
      <PageHeader
        title="Exams & Grades"
        subtitle="Marks entry, automatic grading, and report card generation"
        actions={
          <>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <FileDown className="h-4 w-4" /> Generate report cards
            </button>
            <Can permission="exams.write">
              <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]">
                <Plus className="h-4 w-4" /> Save
              </button>
            </Can>
          </>
        }
      />

      <BentoCard className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Term</label>
            <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} disabled={terms.length === 0} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50">
              {terms.length === 0 ? <option value="">No terms</option> : terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Class</label>
            <select value={selectedSectionId} onChange={(e) => setSelectedSectionId(e.target.value)} disabled={sections.length === 0} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50">
              {sections.length === 0 ? <option value="">No classes</option> : sections.map((s) => <option key={s.id} value={s.id}>Grade {s.grade} - {s.section}</option>)}
            </select>
          </div>
        </div>
      </BentoCard>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : exams.length === 0 ? (
        <BentoCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400 max-w-sm">No exams configured for this term and class. Create exams to start entering marks.</p>
          </div>
        </BentoCard>
      ) : (
        <BentoCard padding={false}>
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#1A237E]">Marks — {selectedSection && `Grade ${selectedSection.grade} - ${selectedSection.section}`} — {selectedTerm?.name}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Student</th>
                  {exams.map((e) => <th key={e.id} className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">{e.subject}</th>)}
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">Total</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, i) => {
                  const total = exams.reduce((sum, exam) => {
                    const mark = marks[`${exam.id}-${student.id}`];
                    return sum + (mark?.marks_obtained ?? 0);
                  }, 0);
                  const maxTotal = exams.reduce((sum, e) => sum + e.max_marks, 0);
                  const g = grade(total, maxTotal);
                  return (
                    <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{student.name}</td>
                      {exams.map((exam) => {
                        const mark = marks[`${exam.id}-${student.id}`];
                        return (
                          <td key={exam.id} className="px-2 py-2 text-center">
                            <input
                              type="number" min={0} max={exam.max_marks}
                              value={mark?.marks_obtained ?? ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setMarks((prev) => ({
                                  ...prev,
                                  [`${exam.id}-${student.id}`]: {
                                    id: `${exam.id}-${student.id}`,
                                    exam_id: exam.id,
                                    student_id: student.id,
                                    marks_obtained: val,
                                    is_absent: false,
                                  },
                                }));
                              }}
                              className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-sm"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-semibold text-[#1A237E]">{total} / {maxTotal}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${g.color}`}>{g.letter}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}
    </PageShell>
  );
}
