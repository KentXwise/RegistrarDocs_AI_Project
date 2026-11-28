"use client";

import { Check } from "lucide-react";

export const CLAIMING_WINDOW_PRESETS = [
  "Claim at Window 1",
  "Claim at Window 2",
  "Claim at Window 3",
] as const;

export const REQUIRED_ITEM_PRESETS = [
  "Bring your Student ID",
  "Bring a valid government-issued ID",
  "Bring the required supporting documents",
  "Bring your authorization letter (if claiming through a representative)",
] as const;

export const PAYMENT_PRESET = "Prepare the applicable payment, if required";

function ensurePunctuation(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Combines mutually exclusive claiming location, multi-select required items,
 * optional payment reminder, and custom typed instructions into a clean,
 * requester-visible bulleted message. Returns empty string when nothing is
 * selected or entered.
 */
export function buildCombinedCollectionInstructions(params: {
  selectedWindow: string | null;
  selectedItems: readonly string[];
  paymentSelected: boolean;
  customInstructions: string;
}): string {
  const lines: string[] = [];

  if (params.selectedWindow) {
    lines.push(`- ${ensurePunctuation(params.selectedWindow)}`);
  }

  for (const item of REQUIRED_ITEM_PRESETS) {
    if (params.selectedItems.includes(item)) {
      lines.push(`- ${ensurePunctuation(item)}`);
    }
  }

  if (params.paymentSelected) {
    lines.push(`- ${ensurePunctuation(PAYMENT_PRESET)}`);
  }

  const customLines = params.customInstructions
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const customLine of customLines) {
    const cleaned = customLine.replace(/^[-•*]\s*/, "");
    if (cleaned) {
      lines.push(`- ${ensurePunctuation(cleaned)}`);
    }
  }

  return lines.join("\n").slice(0, 1200);
}

interface CollectionInstructionsSelectorProps {
  selectedWindow: string | null;
  onSelectWindow: (windowOption: string | null) => void;
  selectedItems: string[];
  onToggleItem: (item: string) => void;
  paymentSelected: boolean;
  onTogglePayment: () => void;
  customInstructions: string;
  onChangeCustomInstructions: (value: string) => void;
  disabled?: boolean;
}

export function CollectionInstructionsSelector({
  selectedWindow,
  onSelectWindow,
  selectedItems,
  onToggleItem,
  paymentSelected,
  onTogglePayment,
  customInstructions,
  onChangeCustomInstructions,
  disabled = false,
}: CollectionInstructionsSelectorProps) {
  const combinedPreview = buildCombinedCollectionInstructions({
    selectedWindow,
    selectedItems,
    paymentSelected,
    customInstructions,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold tracking-wider text-[#25352B] uppercase">
            1. Collection Instructions (Optional)
          </h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Select the instructions the requester needs to follow when
            collecting their document.
          </p>
        </div>
        <span className="rounded bg-[#E6EFE8] px-2 py-0.5 text-[10px] font-semibold text-[#174D32]">
          Visible to Requester
        </span>
      </div>

      {/* Preset Groups: Claiming Location & Payment side-by-side on wider screens */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* Claiming Location (Mutually Exclusive) */}
        <div className="rounded-lg border border-slate-200 bg-[#F5F5EF]/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wide text-[#25352B] uppercase">
              Claiming Location
            </p>
            <span className="text-[10px] text-slate-500">Select one</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Claiming Location">
            {CLAIMING_WINDOW_PRESETS.map((win) => {
              const active = selectedWindow === win;
              return (
                <button
                  key={win}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => onSelectWindow(active ? null : win)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-60 ${
                    active
                      ? "border-[#174D32] bg-[#174D32] text-white shadow-2xs"
                      : "border-slate-300 bg-white text-[#25352B] hover:border-[#174D32]/50 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                  <span>{win}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment (Optional Toggle) */}
        <div className="rounded-lg border border-slate-200 bg-[#F5F5EF]/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wide text-[#25352B] uppercase">
              Payment (if applicable)
            </p>
            <span className="text-[10px] text-slate-500">Optional</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Payment">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={paymentSelected}
              onClick={onTogglePayment}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-60 ${
                paymentSelected
                  ? "border-[#174D32] bg-[#174D32] text-white shadow-2xs"
                  : "border-slate-300 bg-white text-[#25352B] hover:border-[#174D32]/50 hover:bg-[#E6EFE8] hover:text-[#174D32]"
              }`}
            >
              {paymentSelected && (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>{PAYMENT_PRESET}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Required Items (Multi-Select) */}
      <div className="rounded-lg border border-slate-200 bg-[#F5F5EF]/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold tracking-wide text-[#25352B] uppercase">
            Required Items
          </p>
          <span className="text-[10px] text-slate-500">Select all that apply</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Required Items">
          {REQUIRED_ITEM_PRESETS.map((item) => {
            const active = selectedItems.includes(item);
            return (
              <button
                key={item}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => onToggleItem(item)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#246B45] disabled:opacity-60 ${
                  active
                    ? "border-[#174D32] bg-[#174D32] text-white shadow-2xs"
                    : "border-slate-300 bg-white text-[#25352B] hover:border-[#174D32]/50 hover:bg-[#E6EFE8] hover:text-[#174D32]"
                }`}
              >
                {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                <span>{item}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Custom Instructions */}
      <div>
        <label
          htmlFor="staff-additional-collection-instructions"
          className="block text-xs font-semibold text-[#25352B]"
        >
          Additional Instructions (Optional)
        </label>
        <textarea
          id="staff-additional-collection-instructions"
          rows={2}
          maxLength={600}
          disabled={disabled}
          value={customInstructions}
          onChange={(e) => onChangeCustomInstructions(e.target.value)}
          placeholder="Add any specific instructions for this request..."
          className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 disabled:opacity-60"
        />
      </div>

      {/* Compact Live Preview of Combined Requester-Visible Message */}
      {combinedPreview && (
        <div className="rounded-lg border border-[#246B45]/25 bg-[#E6EFE8]/50 px-3 py-2.5 text-xs">
          <p className="text-[11px] font-bold tracking-wide text-[#174D32] uppercase">
            Preview — Requester Collection Instructions
          </p>
          <p className="mt-1 whitespace-pre-line leading-relaxed text-[#25352B]">
            {combinedPreview}
          </p>
        </div>
      )}
    </div>
  );
}
