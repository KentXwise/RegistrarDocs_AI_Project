"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  ExternalLink,
  Globe,
  Info,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import type {
  AssistantLanguage,
  GroundedSourceRef,
} from "@/lib/ai/assistant-engine";

const LANGUAGE_OPTIONS: readonly {
  value: AssistantLanguage;
  label: string;
}[] = [
  { value: "en", label: "English" },
  { value: "fil", label: "Filipino" },
  { value: "ceb", label: "Bisaya (Cebuano)" },
] as const;

const STORAGE_KEY = "registrardocs_ai_response_language";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: GroundedSourceRef[];
}

const STARTER_PROMPTS = [
  {
    label: "Document requirements",
    question: "What general requirements should I prepare before requesting a document?",
  },
  {
    label: "How to request credentials",
    question: "How do I request my Transcript of Records (TOR)?",
  },
  {
    label: "How to claim my document",
    question: "What should I bring when claiming my documents?",
  },
  {
    label: "Request status explanation",
    question: "What does Ready for Release mean and how do I check my status?",
  },
  {
    label: "Authorized representative",
    question: "Can someone claim my document for me? What should my representative bring?",
  },
  {
    label: "Payment & documentary stamps",
    question: "How do I pay for my document and how many documentary stamps do I need?",
  },
] as const;

export function RegistrarAssistantChat() {
  const [language, setLanguage] = useState<AssistantLanguage>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    return saved === "fil" || saved === "ceb" ? saved : "en";
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const msgCounterRef = useRef(0);

  const handleLanguageChange = (nextLang: AssistantLanguage) => {
    setLanguage(nextLang);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, nextLang);
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const sendQuestion = async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || isSending) return;

    setError(null);
    msgCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `u-${msgCounterRef.current}`,
      role: "user",
      content: question,
    };

    const nextHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/requester/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: nextHistory,
          language,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        answer?: string;
        sources?: GroundedSourceRef[];
        error?: string;
      } | null;

      if (!res.ok || !data?.answer) {
        setError(
          data?.error ||
            "The AI Registrar Assistant is temporarily unavailable. Please try again or contact the Registrar's Office."
        );
        return;
      }

      msgCounterRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${msgCounterRef.current}`,
          role: "assistant",
          content: data.answer!,
          sources: data.sources ?? [],
        },
      ]);
    } catch {
      setError(
        "A network error occurred while contacting the AI Registrar Assistant."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#174D32] uppercase">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>DNSC Registrar Support</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#25352B]">
            AI Registrar Assistant
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Ask questions in English, Filipino, or Cebuano about DNSC document
            services, requirements, claiming, representatives, and request
            statuses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Response Language Selector (preserves conversation history) */}
          <div
            role="group"
            aria-label="Assistant response language"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs"
          >
            <span className="inline-flex items-center gap-1 px-2 text-[11px] font-semibold text-slate-500">
              <Globe className="h-3.5 w-3.5 text-[#174D32]" aria-hidden="true" />
              <span className="hidden sm:inline">Language:</span>
            </span>
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleLanguageChange(opt.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[#174D32] text-white"
                      : "text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              disabled={isSending}
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#25352B] hover:bg-[#E6EFE8] hover:text-[#174D32] disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Clear AI Informational-Only Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-xl border border-[#246B45]/25 bg-[#E6EFE8]/65 px-4 py-3 text-xs text-[#25352B]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#174D32]" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-[#174D32]">
            Informational AI Assistant Only:
          </strong>{" "}
          Answers are grounded strictly on approved DNSC Registrar information.
          This assistant cannot approve/reject requests, verify personal
          clearances, or replace official decisions by DNSC Registrar Staff.
        </p>
      </div>

      {/* Chat Container */}
      <section className="flex h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6EFE8] text-[#174D32]">
                <Bot className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-base font-bold text-[#25352B]">
                How can I help with your Registrar request today?
              </h2>
              <p className="mt-1 max-w-md text-xs text-slate-600">
                Choose a starter topic below or type your own question in
                English, Filipino, or Cebuano.
              </p>

              <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={isSending}
                    onClick={() => void sendQuestion(item.question)}
                    className="rounded-xl border border-slate-200 bg-[#F5F5EF]/70 px-3.5 py-2.5 text-left text-xs transition-colors hover:border-[#174D32]/40 hover:bg-[#E6EFE8]/70"
                  >
                    <p className="font-bold text-[#174D32]">{item.label}</p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">
                      {item.question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174D32] text-white">
                    <Bot className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
                    msg.role === "user"
                      ? "bg-[#174D32] text-white"
                      : "border border-slate-200 bg-[#F5F5EF]/80 text-[#25352B]"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {msg.role === "assistant" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="mt-3 border-t border-slate-200/80 pt-2">
                        <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                          Approved Sources Referenced
                        </p>
                        <ul className="mt-1 space-y-1">
                          {msg.sources.map((src, idx) => (
                            <li
                              key={`${msg.id}-src-${idx}`}
                              className="flex flex-wrap items-center gap-1.5 text-[11px]"
                            >
                              <span className="font-semibold text-[#174D32]">
                                {src.title}
                              </span>
                              {src.url && (
                                <a
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[#246B45] hover:underline"
                                >
                                  <span>Source</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>

                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6EFE8] text-[#174D32]">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </div>
                )}
              </div>
            ))
          )}

          {isSending && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#174D32] text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#F5F5EF] px-4 py-2.5 text-xs text-slate-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#174D32]" />
                <span>Checking approved DNSC Registrar knowledge...</span>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {error && (
          <div
            role="alert"
            className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
            <span>{error}</span>
          </div>
        )}

        {/* Message Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-[#F5F5EF]/50 p-3 sm:p-4"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={800}
            disabled={isSending}
            placeholder="Ask a question about DNSC documents, requirements, claiming, or status..."
            aria-label="Ask the AI Registrar Assistant"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-[#25352B] placeholder:text-slate-400 focus:border-[#174D32] focus:outline-none focus:ring-2 focus:ring-[#246B45]/25 sm:text-sm"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#174D32] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#246B45] disabled:opacity-50 sm:text-sm"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </section>
    </div>
  );
}
