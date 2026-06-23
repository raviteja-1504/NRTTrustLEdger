import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { Menu, Search, School } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { navGroups } from "./nav-config";
import { useAuth } from "../../lib/auth/AuthContext";
import { useTenant } from "../../lib/tenant/TenantContext";
import UserMenu from "./UserMenu";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { can } = useAuth();
  const { tenant, hasFeature } = useTenant();

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter nav by RBAC + tenant feature flag.
  const visibleGroups = navGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => can(i.permission) && (!i.feature || hasFeature(i.feature))),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Sidebar */}
      <aside
        className={`sticky top-0 h-screen shrink-0 overflow-y-auto bg-gradient-to-b from-[#1A237E] to-[#0d1559] text-white transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Tenant header */}
        <div
          className={`border-b border-white/10 ${
            sidebarOpen ? "flex items-center justify-between p-4" : "flex flex-col items-center gap-3 p-3"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3 overflow-hidden" title={!sidebarOpen ? tenant.name : undefined}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00897B]">
              <School className="h-5 w-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{tenant.name}</div>
                <div className="truncate text-[11px] text-white/60">AY {tenant.academicYear}</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="rounded-lg p-2 transition hover:bg-white/10"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="py-3">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-2">
              {sidebarOpen && (
                <div className="px-5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group relative flex items-center gap-3 px-5 py-2.5 text-sm transition ${
                      active ? "text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeNav"
                        className="absolute inset-y-1 left-2 right-2 rounded-lg bg-[#00897B]"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4 shrink-0" />
                    {sidebarOpen && <span className="relative z-10 truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-gradient-to-r from-[#1A237E] to-[#1A237E]/95 px-6 backdrop-blur-sm shadow-sm">
          <div className="relative flex min-w-0 flex-1 items-center gap-3" ref={searchRef}>
            <div className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm text-white/80 ring-1 ring-white/10 transition focus-within:bg-white/15">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent outline-none placeholder:text-white/40"
                placeholder="Go to page… (Students, Fees, Attendance…)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
                }}
              />
              <kbd className="hidden rounded border border-white/20 px-1.5 text-[10px] text-white/50 md:block">⌘K</kbd>
            </div>
            {/* Search results dropdown */}
            {searchOpen && searchQuery.trim().length > 0 && (() => {
              const q = searchQuery.toLowerCase();
              const matches = visibleGroups.flatMap((g) => g.items).filter((i) => i.name.toLowerCase().includes(q));
              return matches.length > 0 ? (
                <div className="absolute left-0 top-12 z-50 w-full max-w-md rounded-lg border border-white/10 bg-[#1A237E] shadow-xl">
                  {matches.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setSearchOpen(false); setSearchQuery(""); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null;
            })()}
          </div>
          <div className="flex items-center gap-1">
            <UserMenu />
          </div>
        </header>

        {/* Routed page */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <Outlet key={location.pathname} />
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
