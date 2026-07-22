import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-2 mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground", className)}>
      {children}
    </h2>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="my-2 text-sm text-destructive">{children}</p>;
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display font-semibold tabular">{value}</span>
    </div>
  );
}

/** Chip selector — the web equivalent of the mobile app's Badge pickers. */
export function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected ? "border-copper bg-copper/10 text-copper" : "border-line bg-card text-ink hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

/** Splits text on URLs and renders each as a real link — used for Sharing
 *  post bodies and comments, mirroring the mobile Linkified component. */
export function Linkified({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  const isUrl = (part: string) => /^https?:\/\/[^\s]+$/.test(part);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        isUrl(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="text-copper underline break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
