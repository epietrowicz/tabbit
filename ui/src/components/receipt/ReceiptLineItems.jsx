import { useMemo } from "react";
import { formatMoneyAmount } from "../../utils/formatMoney.js";
import { claimedQuantityByLineItem } from "../../utils/claimedQuantityByLineItem.js";

const QTY_EPS = 1e-6;

function formatQtyLabel(n) {
  if (!Number.isFinite(n)) {
    return "?";
  }
  if (Math.abs(n - Math.round(n)) < QTY_EPS) {
    return String(Math.round(n));
  }
  return String(n);
}

function claimLineMeta(lineQty, claimedQty) {
  const total = Number(lineQty);
  const claimed = Number(claimedQty);
  const t = Number.isFinite(total) && total > 0 ? total : 0;
  const c = Number.isFinite(claimed) && claimed > 0 ? claimed : 0;
  if (t <= 0 || c <= 0) {
    return { fullyClaimed: false, partial: null };
  }
  const remaining = Math.max(0, t - c);
  if (remaining <= QTY_EPS) {
    return { fullyClaimed: true, partial: null };
  }
  return { fullyClaimed: false, partial: { remaining, total: t } };
}

export function ReceiptLineItems({
  lineItems,
  receiptClaims,
  mimetype,
  currency,
}) {
  const cur = currency;
  const claimedByLine = useMemo(
    () => claimedQuantityByLineItem(receiptClaims),
    [receiptClaims],
  );

  const strikeThrough = "line-through opacity-70";

  return (
    <section
      className="card card-border bg-base-200 border-base-300 mb-8 shadow-md"
      aria-labelledby="receipt-items-heading"
    >
      <div className="card-body gap-0 text-left">
        <h2 id="receipt-items-heading" className="mb-3 text-lg font-semibold">
          Items
        </h2>
        {lineItems.length === 0 ? (
          mimetype === "image/svg+xml" ? (
            <p className="text-base-content/90 text-sm leading-relaxed">
              SVG uploads are stored without line-item extraction (raster images
              are itemized when the vision API is available).
            </p>
          ) : (
            <p className="text-base-content/80 text-sm">
              No line items stored for this receipt.
            </p>
          )
        ) : (
          <ul className="divide-base-300 text-base-content divide-y text-sm">
            {lineItems.map((line) => {
              const { fullyClaimed, partial } = claimLineMeta(
                line.quantity,
                claimedByLine.get(line.id) ?? 0,
              );
              return (
                <li
                  key={line.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {partial ? (
                      <span
                        className="badge badge-warning badge-soft badge-sm shrink-0 font-normal"
                        title={`${formatQtyLabel(partial.remaining)} of ${formatQtyLabel(partial.total)} units on this line are not yet claimed.`}
                      >
                        {formatQtyLabel(partial.remaining)} of{" "}
                        {formatQtyLabel(partial.total)} left
                      </span>
                    ) : null}
                    <span
                      className={
                        fullyClaimed
                          ? `min-w-0 font-medium ${strikeThrough}`
                          : "min-w-0 font-medium"
                      }
                    >
                      {line.description}
                    </span>
                  </span>
                  <span
                    className={
                      fullyClaimed
                        ? `shrink-0 tabular-nums sm:text-right ${strikeThrough}`
                        : "shrink-0 tabular-nums sm:text-right"
                    }
                  >
                    <span className="text-base-content/80">
                      {line.quantity} ×{" "}
                      {formatMoneyAmount(line.unit_price, cur)}
                    </span>
                    <span className="mx-2 opacity-50" aria-hidden>
                      ·
                    </span>
                    <span className="font-medium">
                      {formatMoneyAmount(line.line_total, cur)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
