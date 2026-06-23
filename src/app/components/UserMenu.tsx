import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../lib/auth/AuthContext";
import type { Role } from "../../lib/types";

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  accountant: "Accountant",
  admissions_officer: "Admissions Officer",
  parent: "Parent",
};

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const initials = user.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-white/90 transition hover:bg-white/10"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00897B] font-semibold text-white">
          {initials}
        </div>
        <div className="hidden text-left md:block">
          <div className="text-sm font-medium text-white">{user.name}</div>
          <div className="text-xs text-white/60">{roleLabels[user.role]}</div>
        </div>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
            <div className="border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-medium text-[#1A237E]">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
              <div className="mt-1 text-xs font-medium text-[#00897B]">{roleLabels[user.role]}</div>
            </div>
            <div className="p-2">
              <button
                onClick={() => { logout(); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#EF5350] transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
