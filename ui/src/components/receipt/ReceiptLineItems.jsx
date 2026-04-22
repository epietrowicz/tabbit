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
            {lineItems.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <span className="min-w-0 flex-1 font-medium">{line.description}</span>
                <span className="shrink-0 tabular-nums sm:text-right">
                  <span className="text-base-content/80">
                    {line.quantity} × {formatMoneyAmount(line.unit_price, cur)}
                  </span>
                  <span className="mx-2 opacity-50" aria-hidden>
                    ·
                  </span>
                  <span className="font-medium">{formatMoneyAmount(line.line_total, cur)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
