import "server-only";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations, aiMessages, aiPendingActions } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { decryptApiKey } from "@/lib/ai/encryption";
import { READ_TOOLS, TOOL_DEFINITIONS, executeReadTool } from "@/lib/ai/tools";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MAX_LOOP_ITERATIONS = 6;

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Every request — regardless of which model the user picked — goes
 * through this one prompt. That's what makes the assistant "dedicated to
 * this site" rather than a generic chatbot: the model changes, this
 * doesn't. */
function buildSystemPrompt(context: { equipment: string; today: string }): string {
  return [
    "You are the AI Assistant built into Iron Ledger, a personal workout tracker. You help with three things: turning a messy freeform description of a workout into a logged entry, giving honest commentary on training trends from the user's real logged data, and generating or adapting programs.",
    "",
    `Today's date is ${context.today}. The user's home-gym equipment: ${context.equipment || "not specified"}.`,
    "",
    "Rules:",
    "- When the user asks you to log, create, or change something, call the matching tool immediately — don't describe what you would do in prose instead of calling it, and don't narrate the approval process (the UI already shows a clear approve/reject card for anything you propose, so you don't need to explain that step in words).",
    "- Never invent an exerciseId. Always call search_exercises first and use a real id from its results.",
    "- Write a clear, specific one-sentence 'summary' argument on every write tool call — that sentence is what the user sees on the approval card, so make it the actual content (what/when/how much), not a restatement that it's pending approval.",
    "- For update_program, submit the full replacement day list (existing days need their 'id' from get_current_programs to preserve history attached to them; omitting an existing day deletes it) — never assume a partial update.",
    "- get_recent_workouts returns real per-set numbers and a pre-computed totalVolumeKg per session and per exercise (volume = weight x reps, working sets only) — use those numbers directly rather than estimating or recomputing from scratch.",
    "- For trend commentary, base it only on what get_recent_workouts / get_body_metrics actually return — don't speculate beyond the data.",
    "- Keep replies concise and concrete; this is a fitness log, not a wellness essay.",
  ].join("\n");
}

interface WireMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
  reasoning?: string;
}

// A modest, fixed completion budget — the earlier unset default let some
// providers assume up to 32k tokens, which 402'd on a low-credit account
// even for a short reply. This is plenty for a fitness-log assistant and
// costs little regardless of which model is picked.
const MAX_COMPLETION_TOKENS = 4096;

async function callOpenRouter(apiKey: string, model: string, messages: WireMessage[]): Promise<{
  content: string | null;
  toolCalls: ToolCall[];
  reasoning: string | null;
}> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://iron-ledger.local",
      "X-Title": "Iron Ledger",
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOL_DEFINITIONS,
      max_tokens: MAX_COMPLETION_TOKENS,
      // Low effort — this is a fitness log, not a research assistant, and
      // reasoning tokens are billed as output tokens. Models that don't
      // support reasoning just ignore this.
      reasoning: { effort: "low" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const choice = json.choices?.[0];
  if (!choice) throw new Error("OpenRouter returned no completion choices.");

  const message = choice.message;
  const toolCalls: ToolCall[] = (message.tool_calls ?? []).map((tc: { id: string; function: { name: string; arguments: string } }) => {
    let parsedArgs: Record<string, unknown> = {};
    try {
      parsedArgs = JSON.parse(tc.function.arguments || "{}");
    } catch {
      // A model that returns malformed JSON args is a model problem, not
      // ours — surface an empty object rather than crashing the loop, so
      // the resulting pending action / tool error is visible to the user.
    }
    return { id: tc.id, name: tc.function.name, arguments: parsedArgs };
  });

  return { content: message.content ?? null, toolCalls, reasoning: typeof message.reasoning === "string" ? message.reasoning : null };
}

function rowToWireMessage(row: typeof aiMessages.$inferSelect): WireMessage {
  if (row.role === "assistant") {
    const calls = (row.toolCalls as ToolCall[] | null) ?? [];
    return {
      role: "assistant",
      content: row.content,
      reasoning: row.reasoning ?? undefined,
      tool_calls: calls.length
        ? calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: JSON.stringify(c.arguments) } }))
        : undefined,
    };
  }
  if (row.role === "tool") {
    return { role: "tool", content: row.content, tool_call_id: row.toolCallId ?? undefined };
  }
  return { role: "user", content: row.content };
}

/** Runs (or resumes) the agent loop for a conversation: sends the current
 * message history to the model, executes any read tools inline, and stops
 * either on a plain text reply or the moment a write tool is requested —
 * at which point a pending action is waiting in the DB for the user to
 * approve or reject (see approveAction/rejectAction in
 * lib/actions/ai-chat.ts), rather than being applied here. */
export async function runAgentLoop(conversationId: string): Promise<void> {
  const user = await requireCurrentUser();

  const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
  if (!conversation || conversation.userId !== user.id) throw new Error("Conversation not found.");

  if (!user.settings.openrouterKeyEncrypted) throw new Error("Connect an OpenRouter key in Settings first.");
  if (!user.settings.preferredAiModel) throw new Error("Pick a model in Settings first.");
  const apiKey = decryptApiKey(user.settings.openrouterKeyEncrypted);
  const model = user.settings.preferredAiModel;

  const equipmentBits: string[] = [];
  if (user.profile?.dumbbellMaxKg) equipmentBits.push(`dumbbells up to ${user.profile.dumbbellMaxKg}kg`);
  if (user.profile?.barbellWeightKg) equipmentBits.push(`a ${user.profile.barbellWeightKg}kg barbell`);
  if (user.profile?.ezBarWeightKg) equipmentBits.push(`an EZ bar`);
  if (user.profile?.bandMaxKg) equipmentBits.push(`resistance bands`);

  const systemPrompt = buildSystemPrompt({
    equipment: equipmentBits.join(", "),
    today: new Date().toISOString().slice(0, 10),
  });

  for (let iteration = 0; iteration < MAX_LOOP_ITERATIONS; iteration++) {
    const history = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(asc(aiMessages.createdAt));

    const wireMessages: WireMessage[] = [{ role: "system", content: systemPrompt }, ...history.map(rowToWireMessage)];

    const { content, toolCalls, reasoning } = await callOpenRouter(apiKey, model, wireMessages);

    await db.insert(aiMessages).values({
      conversationId,
      role: "assistant",
      content,
      toolCalls: toolCalls.length ? toolCalls : null,
      reasoning,
    });

    if (toolCalls.length === 0) {
      // Plain text reply, nothing left to do this turn.
      await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
      return;
    }

    let requestedWrite = false;
    for (const call of toolCalls) {
      if (READ_TOOLS.has(call.name)) {
        let result: unknown;
        try {
          result = await executeReadTool(user.id, user.settings.timezone, call.name, call.arguments);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Tool failed." };
        }
        await db.insert(aiMessages).values({
          conversationId,
          role: "tool",
          content: JSON.stringify(result),
          toolCallId: call.id,
          toolName: call.name,
        });
      } else {
        // A write tool — don't execute it. Park it as a pending action for
        // the user to approve, and satisfy the API's requirement that
        // every tool_call gets *some* tool-role response now.
        requestedWrite = true;
        const summary = typeof call.arguments.summary === "string" ? call.arguments.summary : `Run ${call.name}`;
        await db.insert(aiPendingActions).values({
          conversationId,
          toolCallId: call.id,
          toolName: call.name,
          toolArgs: call.arguments,
          summary,
        });
        await db.insert(aiMessages).values({
          conversationId,
          role: "tool",
          content: JSON.stringify({ status: "awaiting_user_confirmation" }),
          toolCallId: call.id,
          toolName: call.name,
        });
      }
    }

    await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));

    if (requestedWrite) {
      // Stop here — approveAction/rejectAction will update the placeholder
      // tool result and call runAgentLoop again once the user decides.
      return;
    }
    // Only read tools ran — loop again so the model can use their results.
  }
}
