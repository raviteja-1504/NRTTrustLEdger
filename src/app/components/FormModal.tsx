import type { MouseEvent, FormEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Primary action button label (e.g. "Create", "Save"). */
  submitLabel?: string;
  /** Called when the user clicks the primary action. */
  onSubmit?: () => void;
  /** Disable submit when form is invalid / busy. */
  submitting?: boolean;
  submitDisabled?: boolean;
  /** Max width class; defaults to md (28rem). Use "lg" for wider forms. */
  size?: "md" | "lg" | "xl";
  children: ReactNode;
}

const sizes = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
} as const;

/**
 * Standard modal wrapper for forms. Uses native <form> submit so Enter key works
 * and validation can be declared with required / pattern attributes.
 *
 *   <FormModal open={open} onClose={close} title="Add Student" onSubmit={save}>
 *     <Input … />
 *     …
 *   </FormModal>
 */
export default function FormModal({
  open,
  onClose,
  title,
  subtitle,
  submitLabel = "Save",
  onSubmit,
  submitting = false,
  submitDisabled = false,
  size = "md",
  children,
}: FormModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e: MouseEvent<HTMLFormElement>) => e.stopPropagation()}
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              onSubmit?.();
            }}
            className={`w-full ${sizes[size]} overflow-hidden rounded-xl bg-white shadow-xl`}
          >
            <div className="flex items-center justify-between border-b border-gray-100 bg-[#FAFAFA] p-5">
              <div>
                <h3 className="text-lg font-semibold text-[#1A237E]">{title}</h3>
                {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 transition hover:bg-gray-200"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || submitDisabled}
                className="flex items-center gap-2 rounded-lg bg-[#00897B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00796B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {submitLabel}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Compact labeled text/number input used across forms. */
export function Field({
  label,
  required,
  children,
  hint,
}: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-[#EF5350]">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

/** Unified input styling used inside <Field>. */
export const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#00897B] focus:ring-2 focus:ring-[#00897B]/20";
