import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "./FormModal";

export type FeeFrequency = "Annual" | "Quarterly" | "Monthly" | "One-time";

export interface FeeHead {
  id: string;
  name: string;
  amount: number;
  frequency: FeeFrequency;
}

export interface FeeDiscount {
  amount: number;
  comment: string;
}

export interface FeePlan {
  heads: FeeHead[];
  discount: FeeDiscount;
}

export const feeFrequencies: FeeFrequency[] = ["Annual", "Quarterly", "Monthly", "One-time"];

export function createFeeHead(name = "New head", amount = 0, frequency: FeeFrequency = "Annual"): FeeHead {
  return {
    id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    amount,
    frequency,
  };
}

export function calculateFeeTotals(plan: FeePlan) {
  const gross = plan.heads.reduce((sum, head) => sum + (Number(head.amount) || 0), 0);
  const discount = Math.min(Number(plan.discount.amount) || 0, gross);
  return {
    gross,
    discount,
    net: Math.max(0, gross - discount),
  };
}

interface FeeBuilderProps {
  plan: FeePlan;
  onChange: (plan: FeePlan) => void;
  readOnly?: boolean;
}

export default function FeeBuilder({ plan, onChange, readOnly = false }: FeeBuilderProps) {
  const totals = calculateFeeTotals(plan);

  const updateHead = (id: string, patch: Partial<FeeHead>) => {
    onChange({
      ...plan,
      heads: plan.heads.map((head) => (head.id === id ? { ...head, ...patch } : head)),
    });
  };

  const removeHead = (id: string) => {
    onChange({ ...plan, heads: plan.heads.filter((head) => head.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[#1A237E]">Fee Heads</div>
            <div className="text-xs text-gray-500">Tuition and books are seeded by class; add transport or any student-specific head as needed.</div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onChange({ ...plan, heads: [...plan.heads, createFeeHead()] })}
              className="inline-flex items-center gap-1 rounded-lg border border-[#00897B] bg-white px-3 py-2 text-xs font-medium text-[#00897B] transition hover:bg-[#E0F2F1]"
            >
              <Plus className="h-3.5 w-3.5" /> Head
            </button>
          )}
        </div>

        <div className="space-y-2">
          {plan.heads.map((head) => (
            <div key={head.id} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-gray-100 bg-white p-2 sm:grid-cols-[minmax(0,1fr)_112px_120px_auto]">
              <input
                value={head.name}
                onChange={(e) => updateHead(head.id, { name: e.target.value })}
                disabled={readOnly}
                className="min-w-0 rounded-md bg-transparent px-2 py-1 text-sm outline-none focus:bg-gray-50 disabled:text-gray-700"
              />
              <input
                type="number"
                min={0}
                value={head.amount}
                onChange={(e) => updateHead(head.id, { amount: Number(e.target.value) })}
                disabled={readOnly}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-right text-sm disabled:bg-gray-50"
              />
              <select
                value={head.frequency}
                onChange={(e) => updateHead(head.id, { frequency: e.target.value as FeeFrequency })}
                disabled={readOnly}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:bg-gray-50"
              >
                {feeFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeHead(head.id)}
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${head.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
        <div className="mb-3 text-sm font-semibold text-amber-900">Discount</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <input
            type="number"
            min={0}
            max={totals.gross}
            value={plan.discount.amount}
            onChange={(e) => onChange({ ...plan, discount: { ...plan.discount, amount: Number(e.target.value) } })}
            disabled={readOnly}
            className={inputClass}
            aria-label="Discount amount"
          />
          <input
            value={plan.discount.comment}
            onChange={(e) => onChange({ ...plan, discount: { ...plan.discount, comment: e.target.value } })}
            disabled={readOnly}
            className={inputClass}
            placeholder="Reason or approval note"
            aria-label="Discount comment"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-[#E3F2FD] p-3">
          <div className="text-xs text-gray-600">Gross</div>
          <div className="font-bold text-[#1A237E]">₹{totals.gross.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <div className="text-xs text-gray-600">Discount</div>
          <div className="font-bold text-amber-700">₹{totals.discount.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-lg bg-[#E8F5E9] p-3">
          <div className="text-xs text-gray-600">Net Annual</div>
          <div className="font-bold text-[#2E7D32]">₹{totals.net.toLocaleString("en-IN")}</div>
        </div>
      </div>
    </div>
  );
}
