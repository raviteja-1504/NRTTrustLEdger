import { createBrowserRouter } from "react-router";
import type { ReactNode } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import Fees from "./pages/Fees";
import Students from "./pages/Students";
import StudentRoster from "./pages/StudentRoster";
import StudentProfile from "./pages/StudentProfile";
import Communications from "./pages/Communications";
import Settings from "./pages/Settings";
import Attendance from "./pages/Attendance";
// Timetable commented out — complex conflict logic, will be re-enabled later
// import Timetable from "./pages/Timetable";
import Exams from "./pages/Exams";
import Scholarships from "./pages/Scholarships";
import Expenses from "./pages/Expenses";
import Staff from "./pages/Staff";
import NoticeBoard from "./pages/NoticeBoard";
import Events from "./pages/Events";
// Reports page removed — dashboard has analytics for admins
// Audit Logs are disabled for the current MVP; keep the page/RBAC for future use.
// import AuditLogs from "./pages/AuditLogs";
import ParentPortal from "./pages/ParentPortal";
import Login from "./pages/Login";
import PickSchool from "./pages/PickSchool";
import Forbidden from "./pages/Forbidden";
import { ProtectedRoute } from "../lib/auth/ProtectedRoute";
import type { Permission } from "../lib/types";

// Wrap a page element in a permission gate so direct-URL visits are blocked,
// not just sidebar nav. Mirrors `nav-config.ts` permissions.
const guard = (perm: Permission, node: ReactNode) => (
  <ProtectedRoute permission={perm}>{node}</ProtectedRoute>
);

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/pick-school", Component: PickSchool },
  { path: "/403", Component: Forbidden },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true,                              element: guard("dashboard.read",        <Dashboard />) },
      { path: "admissions",                       element: guard("admissions.read",       <Admissions />) },
      { path: "fees",                             element: guard("fees.read",             <Fees />) },
      { path: "scholarships",                     element: guard("scholarships.read",     <Scholarships />) },
      { path: "expenses",                         element: guard("expenses.read",         <Expenses />) },
      { path: "students",                         element: guard("students.read",         <Students />) },
      { path: "students/:grade",                  element: guard("students.read",         <StudentRoster />) },
      { path: "students/:grade/:studentId",       element: guard("students.read",         <StudentProfile />) },
      { path: "attendance",                       element: guard("attendance.read",       <Attendance />) },
      // { path: "timetable",                     element: guard("timetable.read",        <Timetable />) },
      { path: "exams",                            element: guard("exams.read",            <Exams />) },
      // Library is intentionally disabled for now; re-enable when the module requirements are ready.
      // { path: "library",                          element: guard("library.read",          <Library />) },
      { path: "staff",                            element: guard("staff.read",            <Staff />) },
      { path: "communications",                   element: guard("communications.read",   <Communications />) },
      { path: "notices",                          element: guard("notices.read",          <NoticeBoard />) },
      { path: "events",                           element: guard("events.read",           <Events />) },
      // { path: "audit-logs",                       element: guard("audit.read",            <AuditLogs />) },
      { path: "portal",                           element: guard("parent_portal.read",    <ParentPortal />) },
      { path: "settings",                         element: guard("settings.read",         <Settings />) },
    ],
  },
]);
