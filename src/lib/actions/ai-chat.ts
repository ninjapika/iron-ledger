"use server";

import { revalidatePath } from "next/cache";
import { eq, and, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations, aiMessages, aiPendingActions } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { runAgentLoop } from "@/lib/ai/agent";
import { insertLoggedWorkout, type LoggedSetInput } from "@/lib/actions/workouts";
import { insertCustomProgram, applyCustomProgramUpdate, type CustomDayInput } from "@/lib/actions/programs";

export async function createConversation(): Promise<string> {
  const user = await requireCurrentUser();
  const [conversation] = await db.insert(aiConversations).values({ userId: user.id }).returning();
  return conversation.id;
}

export async function listConversations() {
  const user = await requireCurrentUser();
  return db.select().from(aiConversations).where(eq(aiConversations.userId, user.id)).orderBy(desc(aiConversations.updatedAt));
}

export async function getConversation(conversationId: string) {
  const user = await requireCurrentUser();
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, user.id)))
    .limit(1);
  if (!conversation) return null;

  const [messages, pendingActions] = await Promise.all([
    db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(asc(aiMessages.createdAt)),
    db.select().from(aiPendingActions).where(and(eq(aiPendingActions.conversationId, conversationId), eq(aiPendingActions.status, "pending"))),
  ]);

  return { conversation, messages, pendingActions };
}

export async function sendMessage(conversationId: string, text: string): Promise<{ error?: string }> {
  const user = await requireCurrentUser();
  const trimmed = text.trim();
  if (!trimmed) return { error: "Message is empty." };

  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, user.id)))
    .limit(1);
  if (!conversation) return { error: "Conversation not found." };

  await db.insert(aiMessages).values({ conversationId, role: "user", content: trimmed });

  // First message in the conversation becomes its title — kept short since
  // it's just for the sidebar, not a summary of the whole thread.
  if (!conversation.title) {
    await db
      .update(aiConversations)
      .set({ title: trimmed.slice(0, 60) })
      .where(eq(aiConversations.id, conversationId));
  }

  try {
    await runAgentLoop(conversationId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The assistant hit an error." };
  }

  revalidatePath("/assistant");
  return {};
}

/** Actually performs the write the model proposed, using the same insert
 * functions the ordinary forms use — nothing about the DB write path
 * itself is AI-specific, only the fact that it waited for approval first. */
async function applyPendingAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  switch (toolName) {
    case "log_workout": {
      const session = await insertLoggedWorkoutFromArgs(args);
      return `Logged: session ${session.id}.`;
    }
    case "create_program": {
      const programId = await insertCustomProgram(
        String(args.name ?? "Untitled Program"),
        String(args.description ?? ""),
        (args.days ?? []) as CustomDayInput[]
      );
      return `Created program ${programId}.`;
    }
    case "update_program": {
      await applyCustomProgramUpdate(
        String(args.programId),
        String(args.name ?? ""),
        String(args.description ?? ""),
        (args.days ?? []) as CustomDayInput[]
      );
      return `Updated program ${args.programId}.`;
    }
    default:
      throw new Error(`Unknown write tool: ${toolName}`);
  }
}

async function insertLoggedWorkoutFromArgs(args: Record<string, unknown>) {
  return insertLoggedWorkout(
    String(args.isoDateTime),
    String(args.notes ?? ""),
    (args.sets ?? []) as LoggedSetInput[],
    typeof args.workoutType === "string" ? args.workoutType : undefined
  );
}

export async function approveAction(pendingActionId: string): Promise<{ error?: string }> {
  const user = await requireCurrentUser();
  const [action] = await db.select().from(aiPendingActions).where(eq(aiPendingActions.id, pendingActionId)).limit(1);
  if (!action || action.status !== "pending") return { error: "That action is no longer pending." };

  const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, action.conversationId)).limit(1);
  if (!conversation || conversation.userId !== user.id) return { error: "Not found." };

  let resultText: string;
  try {
    resultText = await applyPendingAction(action.toolName, action.toolArgs as Record<string, unknown>);
  } catch (err) {
    resultText = `Failed to apply: ${err instanceof Error ? err.message : "unknown error"}`;
    await db
      .update(aiPendingActions)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(aiPendingActions.id, pendingActionId));
    await updateToolResultMessage(action.conversationId, action.toolCallId, resultText);
    return { error: resultText };
  }

  await db.update(aiPendingActions).set({ status: "approved", resolvedAt: new Date() }).where(eq(aiPendingActions.id, pendingActionId));
  await updateToolResultMessage(action.conversationId, action.toolCallId, resultText);

  try {
    await runAgentLoop(action.conversationId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The assistant hit an error continuing after approval." };
  }

  revalidatePath("/assistant");
  return {};
}

export async function rejectAction(pendingActionId: string): Promise<{ error?: string }> {
  const user = await requireCurrentUser();
  const [action] = await db.select().from(aiPendingActions).where(eq(aiPendingActions.id, pendingActionId)).limit(1);
  if (!action || action.status !== "pending") return { error: "That action is no longer pending." };

  const [conversation] = await db.select().from(aiConversations).where(eq(aiConversations.id, action.conversationId)).limit(1);
  if (!conversation || conversation.userId !== user.id) return { error: "Not found." };

  await db.update(aiPendingActions).set({ status: "rejected", resolvedAt: new Date() }).where(eq(aiPendingActions.id, pendingActionId));
  await updateToolResultMessage(action.conversationId, action.toolCallId, "The user declined this change — it was not applied.");

  try {
    await runAgentLoop(action.conversationId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "The assistant hit an error continuing after rejection." };
  }

  revalidatePath("/assistant");
  return {};
}

/** Rewrites the placeholder "awaiting_user_confirmation" tool-result
 * message with the real outcome, so the next call to the model sees what
 * actually happened instead of a stale placeholder. */
async function updateToolResultMessage(conversationId: string, toolCallId: string, content: string) {
  const rows = await db
    .select()
    .from(aiMessages)
    .where(and(eq(aiMessages.conversationId, conversationId), eq(aiMessages.toolCallId, toolCallId)));
  const row = rows[0];
  if (!row) return;
  await db.update(aiMessages).set({ content: JSON.stringify({ result: content }) }).where(eq(aiMessages.id, row.id));
}
