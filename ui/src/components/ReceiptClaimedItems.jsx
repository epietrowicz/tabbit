import { useId, useMemo } from "react";
import { formatMoneyAmount } from "../utils/formatMoney.js";

/**
 * @param {{
 *   currency: string | null | undefined,
 *   messages: Array<{
 *     id: number,
 *     body: string,
 *     claimer_name?: string | null,
 *     created_at: string,
 *     claims?: Array<{
 *       id: number,
 *       receipt_line_item_id: number,
 *       quantity_claimed: number,
 *       allocated_amount: number,
 *       line_description?: string,
 *       line_index?: number,
 *     }>,
 *     claimParseError?: string,
 *     shared_overhead_amount?: number | null,
 *   }>,
 *   receiptTotalAmount: number | null | undefined,
 * }} props
 */
export function ReceiptClaimedItems({
  currency,
  messages,
  receiptTotalAmount,
}) {
  const headingId = useId();

  const totalClaimed = useMemo(() => {
    let sum = 0;
    for (const m of messages) {
      if (m.claims?.length) {
        for (const c of m.claims) {
          const n = Number(c.allocated_amount);
          if (Number.isFinite(n)) sum += n;
        }
      }
      const sh = Number(m.shared_overhead_amount);
      if (Number.isFinite(sh) && sh > 0) {
        sum += sh;
      }
    }
    return sum;
  }, [messages]);

  const receiptTotalNum = useMemo(() => {
    const n = Number(receiptTotalAmount);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [receiptTotalAmount]);

  const remaining =
    receiptTotalNum != null
      ? Math.max(0, receiptTotalNum - totalClaimed)
      : null;

  return (
    <section
      className="card card-border bg-base-200 border-base-300 mb-8 shadow-md"
      aria-labelledby={headingId}
    >
      <div className="card-body gap-0 text-left">
        <h2 id={headingId} className="mb-1 text-lg font-semibold">
          Claimed items
        </h2>
        <p className="text-base-content/80 mb-4 text-sm">
          Line matches and amounts from each claim message.
        </p>

        <div
          className="bg-base-300 border-base-300 mb-4 max-h-64 space-y-3 overflow-y-auto rounded-box border p-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              No claims yet — add a message below.
            </p>
          ) : (
            messages.map((m) => (
              <article
                key={m.id}
                className="bg-base-100 border-base-300 text-base-content rounded-box border px-3 py-2 text-sm shadow-sm"
              >
                {m.claimer_name ? (
                  <p className="text-base-content/90 mb-1 font-semibold">
                    {m.claimer_name}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {m.body}
                </p>
                <p className="text-base-content/60 mt-1 text-xs">
                  {m.created_at}
                </p>
                {m.claimParseError ? (
                  <div
                    className="alert alert-warning alert-soft mt-2 py-2 text-xs"
                    role="status"
                  >
                    <span>Line matching failed: {m.claimParseError}</span>
                  </div>
                ) : null}
                {m.claims && m.claims.length > 0 ? (
                  <>
                    <ul className="border-base-300 mt-2 space-y-1 border-t pt-2 text-xs">
                      {m.claims.map((c) => (
                        <li key={c.id}>
                          <span className="font-medium">
                            {c.line_description ??
                              `Line #${c.line_index ?? "?"}`}
                          </span>
                          <span className="text-base-content/80">
                            {" "}
                            — qty {c.quantity_claimed} →{" "}
                            <span className="tabular-nums font-medium">
                              {formatMoneyAmount(c.allocated_amount, currency)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {(() => {
                      const lineSum = m.claims.reduce((s, c) => {
                        const n = Number(c.allocated_amount);
                        return s + (Number.isFinite(n) ? n : 0);
                      }, 0);
                      const sh = Number(m.shared_overhead_amount);
                      const sharedNum =
                        Number.isFinite(sh) && sh > 0 ? sh : 0;
                      return (
                        <>
                          {sharedNum > 0 ? (
                            <p className="text-base-content/85 border-base-300 mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 text-xs">
                              <span className="font-medium">
                                Shared (tax, tip, common)
                              </span>
                              <span className="tabular-nums font-medium">
                                {formatMoneyAmount(sharedNum, currency)}
                              </span>
                            </p>
                          ) : null}
                          <p className="border-base-300 mt-2 flex justify-end border-t pt-2 text-xs font-medium tabular-nums">
                            Message total:{" "}
                            {formatMoneyAmount(lineSum + sharedNum, currency)}
                          </p>
                        </>
                      );
                    })()}
                  </>
                ) : null}
              </article>
            ))
          )}
        </div>

        {receiptTotalNum != null ? (
          <div className="border-base-300 space-y-2 border-t pt-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base-content/80">Receipt total</span>
              <span className="tabular-nums">
                {formatMoneyAmount(receiptTotalNum, currency)}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-semibold">Total claimed</span>
              <span className="tabular-nums font-semibold">
                {formatMoneyAmount(totalClaimed, currency)}
              </span>
            </div>
            <div className="border-base-300 flex flex-wrap items-baseline justify-between gap-2 border-t pt-2">
              <span className="font-semibold">Remaining</span>
              <span className="tabular-nums text-base font-semibold">
                {formatMoneyAmount(remaining, currency)}
              </span>
            </div>
          </div>
        ) : totalClaimed > 0 ? (
          <div className="border-base-300 flex flex-wrap items-baseline justify-between gap-2 border-t pt-3 text-sm">
            <span className="font-semibold">Total claimed</span>
            <span className="tabular-nums text-base font-semibold">
              {formatMoneyAmount(totalClaimed, currency)}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
