import { requireCurrentUser } from "@/lib/auth/current-user";
import { listConversations, createConversation, getConversation } from "@/lib/actions/ai-chat";
import { ChatPanel } from "@/components/assistant/chat-panel";
import type { aiMessages, aiPendingActions } from "@/db/schema";

export default async function AssistantPage() {
  const user = await requireCurrentUser();
  const connected = Boolean(user.settings.openrouterKeyEncrypted) && Boolean(user.settings.preferredAiModel);

  let conversationId: string | null = null;
  let messages: (typeof aiMessages.$inferSelect)[] = [];
  let actions: (typeof aiPendingActions.$inferSelect)[] = [];

  if (connected) {
    const existing = await listConversations();
    conversationId = existing[0]?.id ?? (await createConversation());
    const data = await getConversation(conversationId);
    if (data) {
      messages = data.messages;
      actions = data.actions;
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
      <h1 className="mb-4 font-display text-2xl uppercase tracking-wide">AI Assistant</h1>
      {connected && conversationId ? (
        <ChatPanel conversationId={conversationId} initialMessages={messages} initialActions={actions} />
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-theme border border-border bg-surface-2 p-8 text-center">
          <div className="max-w-sm space-y-2">
            <p className="text-text">Connect an OpenRouter key and pick a model in Settings to start.</p>
            <a href="/settings" className="text-sm text-accent-strength underline underline-offset-4">
              Go to Settings
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
