import { formatMoneyAmount } from "../../utils/formatMoney.js";

/**
 * @param {{
 *   lineItems: Array<{ id: number, description: string, quantity: number, unit_price: number, line_total: number }>,
 *   mimetype: string,
 *   currency: string | null | undefined,
 * }} props
 */
export function ReceiptLineItems({ lineItems, mimetype, currency }) {
  const cur = currency;

  return (
    <section
      className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-4 text-left shadow-[var(--shadow)]"
      aria-labelledby="receipt-items-heading"
    >
      <h2
        id="receipt-items-heading"
        className="mb-3 text-lg font-medium text-[var(--text-h)]"
      >
        Items
      </h2>
      {lineItems.length === 0 ? (
        mimetype === "image/svg+xml" ? (
          <p className="text-sm leading-relaxed text-[var(--text)]">
            SVG uploads are stored without line-item extraction (raster images
            are itemized when the vision API is available).
          </p>
        ) : (
          <p className="text-sm text-[var(--text)]">
            No line items stored for this receipt.
          </p>
        )
      ) : (
        <ul className="divide-y divide-[var(--border)] text-sm text-[var(--text)]">
          {lineItems.map((line) => (
            <li
              key={line.id}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
            >
              <span className="min-w-0 flex-1 font-medium text-[var(--text-h)]">
                {line.description}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--text)] sm:text-right">
                <span className="text-[var(--text)] opacity-80">
                  {line.quantity} × {formatMoneyAmount(line.unit_price, cur)}
                </span>
                <span className="mx-2 opacity-50" aria-hidden>
                  ·
                </span>
                <span className="font-medium text-[var(--text-h)]">
                  {formatMoneyAmount(line.line_total, cur)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
