import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { BackButton } from "@/components/layout/back-button";
import { TimezoneSync } from "@/components/settings/timezone-sync";
import { PageTransition } from "@/components/layout/page-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = user.profile?.displayName || user.email;

  return (
    <div className="app-shell flex min-h-screen">
      <TimezoneSync storedTimezone={user.settings.timezone} />
      <Sidebar displayName={name} />
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <BackButton />
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
