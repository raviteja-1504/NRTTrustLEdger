import { motion } from "motion/react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

/** Reusable animated page header. Used at the top of every feature page. */
export default function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-8 flex flex-wrap items-end justify-between gap-4"
    >
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 text-xs text-gray-500 dark:text-gray-400">
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {b.href ? <a href={b.href} className="hover:text-[#00897B]">{b.label}</a> : b.label}
                {i < breadcrumb.length - 1 && <span className="mx-2">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-3xl font-semibold text-[#1A237E] dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

/** Wrap page bodies for consistent enter animation + background. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#FAFAFA] p-8 dark:bg-[#0f1115]"
    >
      {children}
    </motion.div>
  );
}
