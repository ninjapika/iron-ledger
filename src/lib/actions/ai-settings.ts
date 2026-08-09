"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { encryptApiKey, maskApiKey } from "@/lib/ai/encryption";
import { verifyOpenRouterKey } from "@/lib/ai/openrouter";
import type { ActionResult } from "@/lib/actions/settings";

/** Validates the key against OpenRouter before ever storing it — a bad
 * paste fails here, in Settings, with a clear reason, instead of showing
 * up as a confusing error the next time the assistant is used. Swapping in
 * a new key later just overwrites this row; nothing about past
 * conversations depends on which key made them (see ai/README notes) so
 * there's nothing to migrate. */
export async function saveOpenRouterKey(formData: FormData): Promise<ActionResult> {
  const user = await requireCurrentUser();
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!apiKey) return { error: "Paste your OpenRouter API key first." };

  const check = await verifyOpenRouterKey(apiKey);
  if (!check.ok) return { error: check.error };

  await db
    .update(userSettings)
    .set({
      openrouterKeyEncrypted: encryptApiKey(apiKey),
      openrouterKeyPreview: maskApiKey(apiKey),
    })
    .where(eq(userSettings.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function disconnectOpenRouter(): Promise<ActionResult> {
  const user = await requireCurrentUser();
  await db
    .update(userSettings)
    .set({ openrouterKeyEncrypted: null, openrouterKeyPreview: null, preferredAiModel: null })
    .where(eq(userSettings.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}

export async function setPreferredAiModel(modelId: string): Promise<ActionResult> {
  const user = await requireCurrentUser();
  if (!modelId) return { error: "Pick a model first." };

  await db.update(userSettings).set({ preferredAiModel: modelId }).where(eq(userSettings.userId, user.id));

  revalidatePath("/settings");
  return { success: true };
}
