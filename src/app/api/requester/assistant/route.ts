import { NextResponse } from "next/server";
import {
  answerRegistrarQuestion,
  type AssistantLanguage,
  type ChatTurn,
} from "@/lib/ai/assistant-engine";
import { requireApiAuth } from "@/lib/auth/rbac";

// Simple in-memory per-user rate limiter (20 messages / 60s)
const userBuckets = new Map<string, { count: number; resetAt: number }>();

function checkAssistantRateLimit(userId: string): boolean {
  const now = Date.now();
  const current = userBuckets.get(userId);
  if (!current || current.resetAt <= now) {
    userBuckets.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

/**
 * Authenticated Requester AI Registrar Assistant endpoint.
 * Strictly informational: never reads private student request records or sends
 * PII (student name, student ID, uploaded files) to the AI.
 */
export async function POST(request: Request) {
  const auth = await requireApiAuth(["requester"]);
  if (!auth.ok) return auth.response;

  if (!checkAssistantRateLimit(auth.user.id)) {
    return NextResponse.json(
      {
        error:
          "You are sending questions too quickly. Please wait a moment before asking again.",
      },
      { status: 429 }
    );
  }

  let body: { message?: unknown; history?: unknown; language?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }

  const language: AssistantLanguage =
    body.language === "fil" || body.language === "ceb" ? body.language : "en";

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json(
      { error: "Please enter a question for the Registrar Assistant." },
      { status: 400 }
    );
  }
  if (message.length > 800) {
    return NextResponse.json(
      { error: "Questions must be 800 characters or fewer." },
      { status: 400 }
    );
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is ChatTurn =>
            Boolean(item) &&
            typeof item === "object" &&
            ((item as ChatTurn).role === "user" ||
              (item as ChatTurn).role === "assistant") &&
            typeof (item as ChatTurn).content === "string"
        )
        .slice(-6)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 1200),
        }))
    : [];

  try {
    const reply = await answerRegistrarQuestion({
      question: message,
      history,
      language,
    });
    return NextResponse.json(reply, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        error:
          "The AI Registrar Assistant is temporarily unavailable. You can still browse the Document Catalog, FAQs, or contact the DNSC Registrar at registrar@dnsc.edu.ph.",
      },
      { status: 503 }
    );
  }
}
