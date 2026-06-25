import { useParams, useNavigate } from "react-router";
import BentoCard from "../components/BentoCard";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Download, Upload, Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../../lib/auth/AuthContext";
import type { Permission } from "../../lib/types";
import { Can } from "../../lib/auth/Can";
import FormModal, { Field, inputClass } from "../components/FormModal";
import FeeBuilder, { calculateFeeTotals, createFeeHead, type FeePlan } from "../components/FeeBuilder";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Mock academic data
const academicData = [
  { subject: 'Mathematics', marks: 92, maxMarks: 100 },
  { subject: 'Science', marks: 88, maxMarks: 100 },
  { subject: 'English', marks: 85, maxMarks: 100 },
  { subject: 'Hindi', marks: 90, maxMarks: 100 },
  { subject: 'Social Studies', marks: 87, maxMarks: 100 },
];

// Mock progress data
const progressData = [
  { exam: 'Unit 1', percentage: 82 },
  { exam: 'Unit 2', percentage: 85 },
  { exam: 'Mid-Term', percentage: 88 },
  { exam: 'Unit 3', percentage: 87 },
  { exam: 'Unit 4', percentage: 90 },
];

// Mock attendance data
const attendanceMonths = [
  { month: 'Aug', present: 22, absent: 2 },
  { month: 'Sep', present: 24, absent: 0 },
  { month: 'Oct', present: 21, absent: 3 },
  { month: 'Nov', present: 23, absent: 1 },
  { month: 'Dec', present: 20, absent: 2 },
  { month: 'Jan', present: 22, absent: 1 },
];

// Mock fee transactions
const feeTransactions = [
  { date: '01-Apr-2025', description: 'Tuition Fee - Q1', amount: 12500, status: 'paid', receipt: 'RCP2025001' },
  { date: '01-Jul-2025', description: 'Tuition Fee - Q2', amount: 12500, status: 'paid', receipt: 'RCP2025145' },
  { date: '01-Oct-2025', description: 'Tuition Fee - Q3', amount: 12500, status: 'paid', receipt: 'RCP2025289' },
  { date: '15-Nov-2025', description: 'Annual Day Fee', amount: 1500, status: 'paid', receipt: 'RCP2025334' },
  { date: '01-Jan-2026', description: 'Tuition Fee - Q4', amount: 12500, status: 'pending', receipt: '-' },
];

// Mock documents
const documents = [
  { id: '1', name: 'Aadhar Card', type: 'ID Proof', uploadDate: '15-Mar-2025', size: '245 KB' },
  { id: '2', name: 'Birth Certificate', type: 'ID Proof', uploadDate: '15-Mar-2025', size: '189 KB' },
  { id: '3', name: 'Medical Certificate', type: 'Health', uploadDate: '20-Apr-2025', size: '312 KB' },
  { id: '4', name: 'Transfer Certificate', type: 'Academic', uploadDate: '15-Mar-2025', size: '156 KB' },
];

export default function StudentProfile() {
  const { grade, studentId } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  // Each profile tab is gated by a sub-resource permission so roles see only
  // the slices they're entitled to (e.g., teachers don't see Finance/Documents).
  const tabDefs: { value: string; label: string; permission: Permission }[] = [
    { value: "academics",  label: "Academics",  permission: "students.marks.read" },
    { value: "attendance", label: "Attendance", permission: "students.attendance.read" },
    { value: "finance",    label: "Finance",    permission: "students.fees.read" },
    { value: "documents",  label: "Documents",  permission: "students.documents.read" },
  ];
  const visibleTabs = useMemo(
    () => tabDefs.filter((t) => can(t.permission)),
    // tabDefs is static; `can` identity changes on user switch which is what we want.
    [can], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [selectedTab, setSelectedTab] = useState(visibleTabs[0]?.value ?? "academics");
  const [feePlan, setFeePlan] = useState<FeePlan>(() => ({
    heads: [
      createFeeHead("Tuition", 68000),
      createFeeHead("Books", 8200, "One-time"),
      createFeeHead("Transport", 18000),
    ],
    discount: { amount: 5000, comment: "Sibling concession approved by admin" },
  }));
  const [feeDraft, setFeeDraft] = useState<FeePlan>(feePlan);
  const [feeEditOpen, setFeeEditOpen] = useState(false);

  // Mock student data
  const [student, setStudent] = useState({
    id: studentId,
    name: 'Rahul Kumar',
    rollNo: 15,
    section: 'A',
    photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentId}`,
    dateOfBirth: '15-Aug-2010',
    gender: 'Male',
    bloodGroup: 'O+',
    admissionDate: '01-Apr-2024',
    email: 'rahul.kumar@student.school.edu',
    phone: '+91 98765-43210',
    parentName: 'Mr. Vijay Kumar',
    parentPhone: '+91 98765-43200',
    parentEmail: 'vijay.kumar@email.com',
    address: '123, Green Park, Sector 12, New Delhi - 110001',
    overallAttendance: 94,
    currentGPA: 8.8,
  });
  const [studentDraft, setStudentDraft] = useState(student);
  const [studentEditOpen, setStudentEditOpen] = useState(false);

  const feeTotals = calculateFeeTotals(feePlan);
  const totalFee = feeTotals.net;
  const paidAmount = 38500;
  const balanceDue = totalFee - paidAmount;

  const openFeeEditor = () => {
    setFeeDraft({
      heads: feePlan.heads.map((head) => ({ ...head })),
      discount: { ...feePlan.discount },
    });
    setFeeEditOpen(true);
  };

  const saveStudentFeePlan = () => {
    setFeePlan(feeDraft);
    setFeeEditOpen(false);
    toast.success("Student fee structure updated and recorded in audit log");
  };

  const openStudentEditor = () => {
    setStudentDraft({ ...student });
    setStudentEditOpen(true);
  };

  const saveStudentDetails = () => {
    setStudent(studentDraft);
    setStudentEditOpen(false);
    toast.success("Student details updated");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 bg-[#FAFAFA] min-h-screen"
    >
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/students/${grade}`)}
          className="flex items-center gap-2 text-[#00897B] hover:text-[#00796B] mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Grade {grade}</span>
        </button>
        <h1 className="text-3xl font-semibold text-[#1A237E] mb-2">Student 360° Profile</h1>
        <Can permission="students.write">
          <button
            type="button"
            onClick={openStudentEditor}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#283593]"
          >
            <Pencil className="h-4 w-4" /> Edit Student Details
          </button>
        </Can>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <BentoCard>
            <div className="text-center">
              <img 
                src={student.photo} 
                alt={student.name}
                className="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-[#E3F2FD]"
              />
              <h2 className="text-xl font-semibold text-[#1A237E] mb-1">{student.name}</h2>
              <p className="text-gray-600 mb-1">Roll No: {student.rollNo}</p>
              <div className="inline-block px-3 py-1 bg-[#E3F2FD] text-[#1A237E] rounded-full text-sm font-medium">
                Grade {grade} - Section {student.section}
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="text-sm font-semibold text-[#1A237E] mb-4 uppercase">Quick Stats</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Overall Attendance</p>
                <p className="text-2xl font-bold text-[#4CAF50]">{student.overallAttendance}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Current GPA</p>
                <p className="text-2xl font-bold text-[#00897B]">{student.currentGPA}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Fee Status</p>
                <p className={`text-lg font-semibold ${balanceDue > 0 ? 'text-[#EF5350]' : 'text-[#4CAF50]'}`}>
                  {balanceDue > 0 ? `₹${balanceDue.toLocaleString()} Due` : 'Paid'}
                </p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="text-sm font-semibold text-[#1A237E] mb-4 uppercase">Personal Info</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Date of Birth</p>
                <p className="text-[#1A237E] font-medium">{student.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-gray-600">Gender</p>
                <p className="text-[#1A237E] font-medium">{student.gender}</p>
              </div>
              <div>
                <p className="text-gray-600">Blood Group</p>
                <p className="text-[#1A237E] font-medium">{student.bloodGroup}</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="text-sm font-semibold text-[#1A237E] mb-4 uppercase">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-gray-600">Email</p>
                  <p className="text-[#1A237E] break-all">{student.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-gray-600">Phone</p>
                  <p className="text-[#1A237E]">{student.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-gray-600">Address</p>
                  <p className="text-[#1A237E]">{student.address}</p>
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <h3 className="text-sm font-semibold text-[#1A237E] mb-4 uppercase">Parent/Guardian</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="text-[#1A237E] font-medium">{student.parentName}</p>
              </div>
              <div>
                <p className="text-gray-600">Phone</p>
                <p className="text-[#1A237E]">{student.parentPhone}</p>
              </div>
              <div>
                <p className="text-gray-600">Email</p>
                <p className="text-[#1A237E] break-all">{student.parentEmail}</p>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Main Content */}
        <div className="col-span-12 lg:col-span-9">
          <BentoCard>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList
                className="grid w-full mb-6"
                style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
              >
                {visibleTabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
                ))}
              </TabsList>

              {/* Academics Tab */}
              <TabsContent value="academics" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#1A237E] mb-4">Recent Examination Results</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={academicData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="subject" stroke="#616161" />
                      <YAxis stroke="#616161" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="marks" fill="#00897B" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1A237E] mb-4">Performance Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="exam" stroke="#616161" />
                      <YAxis stroke="#616161" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#1A237E" 
                        strokeWidth={3}
                        dot={{ fill: '#00897B', r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1A237E] mb-4">Subject-wise Performance</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {academicData.map((subject) => {
                      const percentage = (subject.marks / subject.maxMarks) * 100;
                      return (
                        <div key={subject.subject} className="p-4 bg-[#F5F5F5] rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-[#1A237E]">{subject.subject}</span>
                            <span className="text-sm font-semibold text-[#00897B]">{subject.marks}/{subject.maxMarks}</span>
                          </div>
                          <div className="w-full bg-white rounded-full h-2">
                            <div 
                              className="bg-[#00897B] h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#1A237E] mb-4">Monthly Attendance Overview</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceMonths}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                      <XAxis dataKey="month" stroke="#616161" />
                      <YAxis stroke="#616161" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #E0E0E0',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="present" fill="#4CAF50" radius={[8, 8, 0, 0]} name="Present" />
                      <Bar dataKey="absent" fill="#EF5350" radius={[8, 8, 0, 0]} name="Absent" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Simple calendar view for current month */}
                  <div className="col-span-7">
                    <h3 className="text-lg font-semibold text-[#1A237E] mb-4">April 2026 - Attendance Calendar</h3>
                    <div className="grid grid-cols-7 gap-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                          {day}
                        </div>
                      ))}
                      {/* Sample days */}
                      {Array.from({ length: 30 }, (_, i) => {
                        const status = Math.random() > 0.1 ? 'present' : 'absent';
                        return (
                          <div 
                            key={i} 
                            className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                              status === 'present' 
                                ? 'bg-[#E8F5E9] text-[#4CAF50]' 
                                : 'bg-[#FFEBEE] text-[#EF5350]'
                            }`}
                          >
                            {i + 1}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#E8F5E9] rounded"></div>
                    <span className="text-gray-600">Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#FFEBEE] rounded"></div>
                    <span className="text-gray-600">Absent</span>
                  </div>
                </div>
              </TabsContent>

              {/* Finance Tab */}
              <TabsContent value="finance" className="space-y-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-[#E3F2FD] rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Annual Fee</p>
                    <p className="text-2xl font-bold text-[#1A237E]">₹{totalFee.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#E8F5E9] rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                    <p className="text-2xl font-bold text-[#4CAF50]">₹{paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-[#FFEBEE] rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Balance Due</p>
                    <p className="text-2xl font-bold text-[#EF5350]">₹{balanceDue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#1A237E]">Student Fee Structure</h3>
                      <p className="text-xs text-gray-500">Individual plan for this student, including optional transport and discount approval note.</p>
                    </div>
                    <Can permission="fees.write">
                      <button
                        type="button"
                        onClick={openFeeEditor}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1A237E] px-3 py-2 text-sm font-medium text-white hover:bg-[#283593]"
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                    </Can>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-[#F5F5F5]">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1A237E]">Head</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-[#1A237E]">Frequency</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-[#1A237E]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feePlan.heads.map((head) => (
                          <tr key={head.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm font-medium text-[#1A237E]">{head.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{head.frequency}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-[#1A237E]">₹{head.amount.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                        {feeTotals.discount > 0 && (
                          <tr className="border-b border-amber-100 bg-amber-50">
                            <td className="px-4 py-3 text-sm font-medium text-amber-800">Discount</td>
                            <td className="px-4 py-3 text-sm text-amber-700">{feePlan.discount.comment || "No comment added"}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-amber-800">-₹{feeTotals.discount.toLocaleString("en-IN")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#1A237E] mb-4">Transaction History</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-[#F5F5F5]">
                          <th className="text-left px-4 py-3 text-sm font-semibold text-[#1A237E]">Date</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-[#1A237E]">Description</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-[#1A237E]">Amount</th>
                          <th className="text-center px-4 py-3 text-sm font-semibold text-[#1A237E]">Status</th>
                          <th className="text-center px-4 py-3 text-sm font-semibold text-[#1A237E]">Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeTransactions.map((transaction, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-600">{transaction.date}</td>
                            <td className="px-4 py-3 text-sm text-[#1A237E]">{transaction.description}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-[#1A237E]">
                              ₹{transaction.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.status === 'paid'
                                  ? 'bg-[#E8F5E9] text-[#4CAF50]'
                                  : 'bg-[#FFF3E0] text-[#FF9800]'
                              }`}>
                                {transaction.status === 'paid' ? '✓ Paid' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {transaction.receipt !== '-' ? (
                                <button className="text-[#00897B] hover:text-[#00796B] text-sm font-medium">
                                  {transaction.receipt}
                                </button>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1A237E]">Secure Document Locker</h3>
                  <button className="flex items-center gap-2 bg-[#00897B] text-white px-4 py-2 rounded-lg hover:bg-[#00796B] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Upload Document</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 bg-[#F5F5F5] rounded-lg hover:bg-[#EEEEEE] transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#1A237E] mb-1">{doc.name}</h4>
                          <p className="text-sm text-gray-600">{doc.type}</p>
                        </div>
                        <button className="text-[#00897B] hover:text-[#00796B]">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{doc.uploadDate}</span>
                        </div>
                        <span>{doc.size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </BentoCard>
        </div>
      </div>

      <FormModal
        open={feeEditOpen}
        onClose={() => setFeeEditOpen(false)}
        title="Edit Student Fee Structure"
        subtitle="Changes to this student's fee plan are saved with an audit-log entry."
        submitLabel="Save Fee Structure"
        size="xl"
        onSubmit={saveStudentFeePlan}
        submitDisabled={feeDraft.heads.length === 0}
      >
        <FeeBuilder plan={feeDraft} onChange={setFeeDraft} />
      </FormModal>

      <FormModal
        open={studentEditOpen}
        onClose={() => setStudentEditOpen(false)}
        title="Edit Student Details"
        subtitle="Admin-only correction for personal and parent information."
        submitLabel="Save Details"
        size="xl"
        onSubmit={saveStudentDetails}
        submitDisabled={!studentDraft.name.trim()}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Student</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <input className={inputClass} value={studentDraft.name} onChange={(e) => setStudentDraft({ ...studentDraft, name: e.target.value })} required />
          </Field>
          <Field label="Roll No.">
            <input type="number" min={1} className={inputClass} value={studentDraft.rollNo} onChange={(e) => setStudentDraft({ ...studentDraft, rollNo: Number(e.target.value) })} />
          </Field>
          <Field label="Section">
            <input className={inputClass} value={studentDraft.section} onChange={(e) => setStudentDraft({ ...studentDraft, section: e.target.value })} />
          </Field>
          <Field label="Date of Birth">
            <input className={inputClass} value={studentDraft.dateOfBirth} onChange={(e) => setStudentDraft({ ...studentDraft, dateOfBirth: e.target.value })} />
          </Field>
          <Field label="Gender">
            <select className={inputClass} value={studentDraft.gender} onChange={(e) => setStudentDraft({ ...studentDraft, gender: e.target.value })}>
              {["Male", "Female", "Other"].map((gender) => <option key={gender}>{gender}</option>)}
            </select>
          </Field>
          <Field label="Blood Group">
            <input className={inputClass} value={studentDraft.bloodGroup} onChange={(e) => setStudentDraft({ ...studentDraft, bloodGroup: e.target.value })} />
          </Field>
          <Field label="Student Email">
            <input type="email" className={inputClass} value={studentDraft.email} onChange={(e) => setStudentDraft({ ...studentDraft, email: e.target.value })} />
          </Field>
          <Field label="Student Phone">
            <input className={inputClass} value={studentDraft.phone} onChange={(e) => setStudentDraft({ ...studentDraft, phone: e.target.value })} />
          </Field>
        </div>

        <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Parent / Guardian</div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Parent Name">
            <input className={inputClass} value={studentDraft.parentName} onChange={(e) => setStudentDraft({ ...studentDraft, parentName: e.target.value })} />
          </Field>
          <Field label="Parent Phone">
            <input className={inputClass} value={studentDraft.parentPhone} onChange={(e) => setStudentDraft({ ...studentDraft, parentPhone: e.target.value })} />
          </Field>
          <Field label="Parent Email">
            <input type="email" className={inputClass} value={studentDraft.parentEmail} onChange={(e) => setStudentDraft({ ...studentDraft, parentEmail: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={studentDraft.address} onChange={(e) => setStudentDraft({ ...studentDraft, address: e.target.value })} />
          </Field>
        </div>
      </FormModal>
    </motion.div>
  );
}
