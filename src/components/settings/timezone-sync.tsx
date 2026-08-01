"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncTimezone } from "@/lib/actions/settings";

export function TimezoneSync({ storedTimezone }: { storedTimezone: string }) {
  const router = useRouter();

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== storedTimezone) {
      syncTimezone(detected).then(() => router.refresh());
    }
    // Only ever needs to run once per mount — re-running on every render
    // would refresh the page in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
