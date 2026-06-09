"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import { reverseWaste } from "@/app/[locale]/app/(protected)/inventory/actions";
import type { WasteLogEntry } from "@/lib/data/queries";
import { WASTE_CATEGORY_KEY } from "@/lib/constants/waste";
import { formatMoney, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function WasteLogTable({
  locale,
  entries,
}: {
  locale: string;
  entries: WasteLogEntry[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function catLabel(name: string | null): string {
    if (!name) return "—";
    const key = WASTE_CATEGORY_KEY[name];
    return key ? t(`waste_category.${key}`) : name;
  }

  function reverse(id: string) {
    setBusyId(id);
    startTransition(async () => {
      await reverseWaste(locale, id);
      setBusyId(null);
      router.refresh();
    });
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {t("inventory.waste_log_empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{t("sales.date")}</th>
            <th className="px-4 py-3 font-semibold">
              {t("recipes.line_ingredient")}
            </th>
            <th className="px-3 py-3 text-right font-semibold">
              {t("inventory.waste_quantity")}
            </th>
            <th className="px-3 py-3 text-right font-semibold">
              {t("inventory.waste_value")}
            </th>
            <th className="px-4 py-3 font-semibold">
              {t("inventory.waste_category")}
            </th>
            <th className="px-4 py-3 font-semibold">{t("inventory.notes")}</th>
            <th className="w-24 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className={cn(
                "border-b border-border/60 last:border-0",
                e.reversed && "opacity-55",
              )}
            >
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {formatDate(e.created_at)}
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn("font-medium", e.reversed && "line-through")}
                >
                  {e.ingredient_name}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {e.quantity} {e.unit}
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                {formatMoney(e.value)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {catLabel(e.category_name)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {e.reason || e.notes || "—"}
              </td>
              <td className="px-4 py-2.5 text-right">
                {e.reversed ? (
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("inventory.reversed")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => reverse(e.id)}
                    disabled={pending && busyId === e.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    {t("inventory.reverse")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
