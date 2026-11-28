"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

interface SearchableComboboxProps {
  id?: string;
  label: string;
  required?: boolean;
  options: readonly string[];
  value: string;
  onChange: (nextValue: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  emptyMessage?: string;
  error?: string;
}

/**
 * Accessible searchable dropdown/combobox that strictly allows selecting from
 * provided options (no arbitrary free-text submission).
 */
export function SearchableCombobox({
  id,
  label,
  required = false,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Type to search...",
  disabled = false,
  disabledHint,
  emptyMessage = "No matching options found.",
  error,
}: SearchableComboboxProps) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const listboxId = `${controlId}-listbox`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filtered.length === 0 ? 0 : (prev + 1) % filtered.length
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        filtered.length === 0
          ? 0
          : (prev - 1 + filtered.length) % filtered.length
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = filtered[highlightedIndex] ?? filtered[0];
      if (target) handleSelect(target);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={controlId}
        className="block text-xs font-semibold tracking-wide text-[#25352B]"
      >
        {label} {required && <span className="text-red-700">*</span>}
      </label>

      <div className="relative mt-1.5">
        <button
          id={controlId}
          type="button"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-invalid={Boolean(error)}
          onClick={() => {
            if (disabled) return;
            setOpen((prev) => !prev);
            setHighlightedIndex(0);
          }}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
              : error
                ? "border-red-500 bg-white text-[#25352B] focus:border-red-600 focus:ring-red-200"
                : "border-slate-300 bg-white text-[#25352B] hover:border-[#174D32]/50 focus:border-[#174D32] focus:ring-[#246B45]/25"
          }`}
        >
          <span className={`truncate ${value ? "font-medium" : "text-slate-400"}`}>
            {value || placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                aria-label={`Clear ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setQuery("");
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${
                open ? "rotate-180 text-[#174D32]" : ""
              }`}
              aria-hidden="true"
            />
          </span>
        </button>

        {open && !disabled && (
          <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 bg-[#F5F5EF]/70 p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label}`}
                  className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-2.5 pl-8 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none"
                />
              </div>
            </div>

            <ul
              id={listboxId}
              role="listbox"
              aria-label={label}
              className="max-h-60 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3.5 py-4 text-center text-xs text-slate-500">
                  {emptyMessage}
                </li>
              ) : (
                filtered.map((option, idx) => {
                  const selected = option === value;
                  const highlighted = idx === highlightedIndex;
                  return (
                    <li
                      key={option}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      onClick={() => handleSelect(option)}
                      className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-xs transition-colors ${
                        selected
                          ? "bg-[#E6EFE8] font-semibold text-[#174D32]"
                          : highlighted
                            ? "bg-[#F5F5EF] text-[#25352B]"
                            : "text-[#25352B] hover:bg-[#F5F5EF]"
                      }`}
                    >
                      <span className="leading-snug">{option}</span>
                      {selected && (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[#174D32]"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {disabled && disabledHint && (
        <p className="mt-1 text-[11px] text-slate-500">{disabledHint}</p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
