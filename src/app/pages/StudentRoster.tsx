import { useParams, Link, useNavigate } from "react-router";
import BentoCard from "../components/BentoCard";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { studentsService, classSectionsService } from "../../lib/services";
import type { ApiStudent, ApiClassSection } from "../../lib/services";
import { ApiError } from "../../lib/api/client";

export default function StudentRoster() {
  const { grade } = useParams<{ grade: string }>();
  const navigate = useNavigate();
  const gradeNum = parseInt(grade ?? "1", 10);

  const [sections, setSections] = useState<ApiClassSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [students, setStudents] = useState<ApiStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingSections, setLoadingSections] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load class sections for this grade
  useEffect(() => {
    setLoadingSections(true);
    classSectionsService.list()
      .then((res) => {
        const forGrade = res.data.filter((s) => s.grade === gradeNum);
        setSections(forGrade);
        if (forGrade.length > 0) setSelectedSectionId(forGrade[0].id);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load sections"))
      .finally(() => setLoadingSections(false));
  }, [gradeNum]);

  // Load students when section changes
  useEffect(() => {
    if (loadingSections) return;
    setLoadingStudents(true);
    setError(null);
    studentsService.list({
      class_section_id: selectedSectionId === "all" ? undefined : selectedSectionId,
      page_size: 200,
    })
      .then((res) => { setStudents(res.data); setTotal(res.meta.total); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load students"))
      .finally(() => setLoadingStudents(false));
  }, [selectedSectionId, loadingSections]);

  const sectionLabel = (s: ApiClassSection) => s.section;
  const sectionFor = (id: string) => sections.find((s) => s.id === id)?.section ?? "—";

  const filtered = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.admission_no.toLowerCase().includes(q) ||
      (s.roll_no?.toString() ?? "").includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => (a.roll_no ?? 0) - (b.roll_no ?? 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-[#FAFAFA] min-h-screen"
    >
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate("/students")}
          className="flex items-center gap-2 text-[#00897B] hover:text-[#00796B] mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to All Grades</span>
        </button>
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Grade {grade} — Class Roster</h1>
        <p className="text-gray-600">{total} students enrolled • click a row to view profile</p>
      </div>

      {/* Filters */}
      <BentoCard className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 relative min-w-48">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or admission no…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#F5F5F5] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00897B]"
            />
          </div>
          {!loadingSections && sections.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Section:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSectionId("all")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedSectionId === "all" ? "bg-[#00897B] text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  All
                </button>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSectionId(s.id)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedSectionId === s.id ? "bg-[#00897B] text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {sectionLabel(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </BentoCard>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Student List */}
      <BentoCard padding={false}>
        {loadingStudents ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading students…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-[#F5F5F5]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A237E]">Roll No.</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A237E]">Student Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A237E]">Admission No.</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-[#1A237E]">Section</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-[#1A237E]">Gender</th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-[#1A237E]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((student) => (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 hover:bg-[#F5F5F5] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-[#1A237E]">{student.roll_no ?? "—"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.photo_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`}
                          alt={student.name}
                          className="w-9 h-9 rounded-full border-2 border-gray-200"
                        />
                        <span className="font-medium text-[#1A237E]">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{student.admission_no}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-[#E3F2FD] text-[#1A237E] rounded-full text-sm font-medium">
                        {sectionFor(selectedSectionId === "all" ? "" : selectedSectionId) === "—"
                          ? sections.find((s) => s.grade === gradeNum)?.section ?? "—"
                          : sectionFor(selectedSectionId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{student.gender ?? "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        to={`/students/${grade}/${student.id}`}
                        className="inline-block px-4 py-2 bg-[#00897B] text-white rounded-lg hover:bg-[#00796B] transition-colors text-sm"
                      >
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No students found.</p>
              </div>
            )}
          </div>
        )}
      </BentoCard>
    </motion.div>
  );
}
