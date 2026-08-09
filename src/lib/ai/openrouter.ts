import "server-only";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number;
  promptPricePerMTok: number;
  completionPricePerMTok: number;
  isFree: boolean;
}

/** Only models that actually support tool calls — the AI Assistant needs
 * that to log workouts, adjust programs, etc., so there's no point
 * surfacing a model that can't do it and would silently fall back to
 * plain chat. OpenRouter can filter this server-side.
 *
 * freeOnly restricts to $0 models. Settings uses this (it sets the
 * account-wide default, so it should never be able to default you onto
 * something that costs credits); the in-chat quick-switcher passes false
 * so you can deliberately reach for a paid model when you want one. */
export async function listOpenRouterModels(freeOnly = false): Promise<OpenRouterModel[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models?supported_parameters=tools`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`OpenRouter model list failed (${res.status}).`);
  }
  const json = await res.json();
  const rows = (json.data ?? []) as Array<{
    id: string;
    name: string;
    context_length: number | null;
    pricing?: { prompt?: string; completion?: string };
  }>;

  return rows
    .map((m) => {
      const prompt = Number(m.pricing?.prompt ?? "0");
      const completion = Number(m.pricing?.completion ?? "0");
      return {
        id: m.id,
        name: m.name,
        contextLength: m.context_length ?? 0,
        promptPricePerMTok: prompt * 1_000_000,
        completionPricePerMTok: completion * 1_000_000,
        isFree: prompt === 0 && completion === 0,
      };
    })
    .filter((m) => !freeOnly || m.isFree)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Validates a key against OpenRouter and returns its account label/tier —
 * used right after the user pastes a key in, so a typo or an already-
 * revoked key fails loudly in Settings instead of on the next chat
 * message. */
export async function verifyOpenRouterKey(
  apiKey: string
): Promise<{ ok: true; label: string | null; isFreeTier: boolean } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE}/key`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch {
    return { ok: false, error: "Couldn't reach OpenRouter — check the server's network access." };
  }

  if (!res.ok) {
    return {
      ok: false,
      error: res.status === 401 ? "OpenRouter rejected that key." : `OpenRouter returned an error (${res.status}).`,
    };
  }

  const json = await res.json();
  return {
    ok: true,
    label: json.data?.label ?? null,
    isFreeTier: Boolean(json.data?.is_free_tier),
  };
}
