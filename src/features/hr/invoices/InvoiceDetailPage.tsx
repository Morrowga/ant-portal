/**
 * Invoice detail — full breakdown of one invoice, with a download link.
 * pdf_url points to a real file on the backend, so a plain <a download>
 * is enough for the browser to save it -- no special handling needed.
 * Styled to read like an actual invoice document (header, itemized line,
 * bold total) rather than a plain stat list.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api } from "@/lib/api-client";
import { fmtDay, fmtStamp } from "@/lib/format";
import type { PayrollInvoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorText } from "@/components/shared/bits";
import { QueryBoundary } from "@/components/shared/QueryBoundary";

function useCompanyInfo(): { currency: string; name: string } {
  const query = useQuery({
    queryKey: ["company", "me"],
    queryFn: async () => (await api.get<{ currency: string; name: string }>("/company/me")).data,
  });
  return { currency: query.data?.currency ?? "USD", name: query.data?.name ?? "" };
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { currency, name: companyName } = useCompanyInfo();
  const invoice = useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => (await api.get<PayrollInvoice>(`/invoices/${id}`)).data,
    enabled: !!id,
  });

  return (
    <div className="mx-auto max-w-lg">
      <Link to="/ants-office/settings?tab=invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Invoices
      </Link>

      <QueryBoundary query={invoice}>
        {(inv) => (
          <Card>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Invoice</p>
                  <p className="mt-1 font-display text-xl font-semibold">
                    {fmtDay(inv.period_start)} – {fmtDay(inv.period_end)}
                  </p>
                </div>
                {companyName && (
                  <p className="text-right text-sm font-medium text-muted-foreground">{companyName}</p>
                )}
              </div>

              {/* Itemized line */}
              <div className="mt-4">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <span>Description</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto_auto] items-baseline gap-4 border-t pt-2">
                  <span className="text-sm">
                    Hours worked
                    <span className="ml-1.5 tabular text-muted-foreground">({inv.total_hours.toFixed(2)}h)</span>
                  </span>
                  <span className="text-right text-sm tabular text-muted-foreground">{fmtMoney(inv.hourly_fee, currency)}/h</span>
                  <span className="text-right text-sm font-medium tabular">{fmtMoney(inv.total_amount, currency)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 flex items-center justify-between border-t-2 border-foreground/20 pt-3">
                <span className="font-display text-base font-semibold">Total</span>
                <span className="font-display text-2xl font-bold tabular">{fmtMoney(inv.total_amount, currency)}</span>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Calculated from {inv.actual_working_hours ? "actual clocked hours" : "scheduled hours minus leave"}
                {" · "}Generated {fmtStamp(inv.generated_at)}
              </p>

              {inv.pdf_url ? (
                <Button asChild className="mt-5 w-full">
                  <a href={inv.pdf_url} download target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Download PDF
                  </a>
                </Button>
              ) : (
                <p className="mt-5 text-center text-xs text-muted-foreground">File not available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </QueryBoundary>
      {invoice.isError && <ErrorText>Couldn't load this invoice.</ErrorText>}
    </div>
  );
}