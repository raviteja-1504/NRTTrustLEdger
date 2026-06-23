import {
  LayoutDashboard, UserPlus, DollarSign, GraduationCap, MessageSquare, Settings,
  CalendarCheck2, ClipboardList, Award, Wallet, CalendarRange,
  Users, Megaphone, CalendarDays, Baby,
} from "lucide-react";
import type { Permission } from "../../lib/types";

export interface NavItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission: Permission;
  feature?: string; // optional tenant feature flag
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sidebar navigation grouped by domain. Each item is RBAC-gated. */
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/", icon: LayoutDashboard, permission: "dashboard.read" },
    ],
  },
  {
    label: "Academics",
    items: [
      { name: "Students", path: "/students", icon: GraduationCap, permission: "students.read" },
      { name: "Attendance", path: "/attendance", icon: CalendarCheck2, permission: "attendance.read" },
      // Timetable disabled — complex scheduling & conflict logic, re-enable later
      // { name: "Timetable", path: "/timetable", icon: CalendarRange, permission: "timetable.read" },
      { name: "Exams & Grades", path: "/exams", icon: ClipboardList, permission: "exams.read" },
      // Library is disabled for now; keep the route/page available for future enhancement.
      // { name: "Library", path: "/library", icon: BookOpen, permission: "library.read", feature: "library" },
    ],
  },
  {
    label: "Admissions",
    items: [
      { name: "Admissions", path: "/admissions", icon: UserPlus, permission: "admissions.read" },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Fees", path: "/fees", icon: DollarSign, permission: "fees.read" },
      { name: "Scholarships", path: "/scholarships", icon: Award, permission: "scholarships.read" },
      { name: "Expenses", path: "/expenses", icon: Wallet, permission: "expenses.read" },
    ],
  },
  {
    label: "People",
    items: [
      { name: "Staff Directory", path: "/staff", icon: Users, permission: "staff.read" },
    ],
  },
  {
    label: "Communication",
    items: [
      { name: "Communications", path: "/communications", icon: MessageSquare, permission: "communications.read", feature: "communications" },
      { name: "Notice Board", path: "/notices", icon: Megaphone, permission: "notices.read", feature: "communications" },
      { name: "Events & Calendar", path: "/events", icon: CalendarDays, permission: "events.read", feature: "communications" },
    ],
  },
  {
    label: "Analytics",
    items: [
      // Audit Logs are disabled for the current MVP. Keep `audit.read` in RBAC
      // so the module can be re-enabled without changing the permission model.
      // { name: "Audit Logs", path: "/audit-logs", icon: ClipboardCheck, permission: "audit.read" },
    ],
  },
  {
    label: "Portal",
    items: [
      { name: "Parent Portal", path: "/portal", icon: Baby, permission: "parent_portal.read", feature: "parentPortal" },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings", path: "/settings", icon: Settings, permission: "settings.read" },
    ],
  },
];
