"use client";

import { useActionState } from "react";
import { logIn, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const initialState: ActionResult = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(async (_: ActionResult, formData: FormData) => {
    return (await logIn(formData)) ?? {};
  }, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="text-sm text-accent-danger">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-text-muted">
        You&apos;ll stay signed in on this device for a while — no need to log in every day.
      </p>
    </form>
  );
}
