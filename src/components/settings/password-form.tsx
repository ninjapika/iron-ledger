"use client";

import { useActionState } from "react";
import { changePassword, type ActionResult } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const initialState: ActionResult = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(async (_: ActionResult, formData: FormData) => {
    const result = await changePassword(formData);
    return result ?? {};
  }, initialState);

  return (
    <form action={formAction} className="space-y-4 max-w-sm">
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <p className="text-sm text-accent-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-accent-strength">Password updated.</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Updating…" : "Change Password"}
      </Button>
    </form>
  );
}
