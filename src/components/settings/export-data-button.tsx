"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { exportAllDataAsJson } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";

export function ExportDataButton() {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const json = await exportAllDataAsJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iron-ledger-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Button variant="secondary" onClick={handleExport} disabled={isPending} className="gap-2">
      <Download size={16} />
      {isPending ? "Preparing…" : "Export all data (JSON)"}
    </Button>
  );
}
