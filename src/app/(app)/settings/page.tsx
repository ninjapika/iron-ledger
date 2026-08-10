import { LogOut } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { logOut } from "@/lib/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemePicker } from "@/components/settings/theme-picker";
import { PasswordForm } from "@/components/settings/password-form";
import { ExportDataButton } from "@/components/settings/export-data-button";
import { OpenRouterCard } from "@/components/settings/openrouter-card";

export default async function SettingsPage() {
  const user = await requireCurrentUser();
  const profile = user.profile;
  const connected = Boolean(user.settings.openrouterKeyEncrypted);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl uppercase tracking-wide">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemePicker currentTheme={user.settings.themePreset} autoRotate={user.settings.autoRotateTheme} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile &amp; Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={{
              displayName: profile?.displayName ?? "",
              age: profile?.age ?? null,
              heightCm: profile?.heightCm ?? null,
              startingWeightKg: profile?.startingWeightKg ?? null,
              goal: profile?.goal ?? null,
              experienceLevel: profile?.experienceLevel ?? null,
              dumbbellMinKg: profile?.dumbbellMinKg ?? null,
              dumbbellMaxKg: profile?.dumbbellMaxKg ?? null,
              dumbbellStepKg: profile?.dumbbellStepKg ?? null,
              barbellWeightKg: profile?.barbellWeightKg ?? null,
              availablePlatesKg: profile?.availablePlatesKg ?? null,
              ezBarWeightKg: profile?.ezBarWeightKg ?? null,
              bandMinKg: profile?.bandMinKg ?? null,
              bandMaxKg: profile?.bandMaxKg ?? null,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <OpenRouterCard connected={connected} keyPreview={user.settings.openrouterKeyPreview} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-4 text-sm text-text-muted">{user.email}</p>
            <PasswordForm />
          </div>
          <div className="border-t border-border pt-4">
            <form action={logOut}>
              <Button type="submit" variant="secondary">
                <LogOut size={16} />
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-text-muted">
            Download everything you&apos;ve logged as a single JSON file — useful as a backup or if you ever want to move it elsewhere.
          </p>
          <ExportDataButton />
        </CardContent>
      </Card>
    </div>
  );
}
