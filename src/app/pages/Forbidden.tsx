import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#FAFAFA] p-6 dark:bg-[#0f1115]">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-[#EF5350] dark:bg-red-500/10">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1A237E] dark:text-white">Access denied</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Your current role does not have permission to view this page. Contact your school administrator if you think this is a mistake.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-[#1A237E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#283593]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
