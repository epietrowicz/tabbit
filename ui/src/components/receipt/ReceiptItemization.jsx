import { formatMoneyAmount } from "../../utils/formatMoney.js";

/**
 * @param {{
 *   merchantName: string | null | undefined,
 *   transactionDate: string | null | undefined,
 *   currency: string | null | undefined,
 *   subtotal: number | null | undefined,
 *   taxTotal: number | null | undefined,
 *   tipTotal: number | null | undefined,
 *   total: number | null | undefined,
 *   grandTotal: number | null | undefined,
 * }} props
 */
export function ReceiptItemization({
  merchantName,
  transactionDate,
  currency,
  subtotal,
  taxTotal,
  tipTotal,
  total,
  grandTotal,
}) {
  const hasMeta = !!merchantName || !!transactionDate || !!currency;
  const hasTotals =
    subtotal != null ||
    taxTotal != null ||
    tipTotal != null ||
    total != null ||
    grandTotal != null;

  if (!hasMeta && !hasTotals) {
    return null;
  }

  const cur = currency;

  return (
    <section
      className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-4 text-left shadow-[var(--shadow)]"
      aria-labelledby="itemization-heading"
    >
      <h2
        id="itemization-heading"
        className="mb-3 text-lg font-medium text-[var(--text-h)]"
      >
        Itemization
      </h2>
      {hasMeta ? (
        <dl className="mb-4 space-y-2 border-b border-[var(--border)] pb-4 text-sm text-[var(--text)]">
          {merchantName ? (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[var(--text-h)]">Merchant</dt>
              <dd>{merchantName}</dd>
            </div>
          ) : null}
          {transactionDate ? (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[var(--text-h)]">Transaction date</dt>
              <dd>{transactionDate}</dd>
            </div>
          ) : null}
          {currency ? (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-[var(--text-h)]">Currency</dt>
              <dd>{currency}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {hasTotals ? (
        <dl className="space-y-2 text-sm text-[var(--text)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[var(--text-h)]">Subtotal</dt>
            <dd className="tabular-nums font-medium text-[var(--text-h)]">
              {formatMoneyAmount(subtotal, cur)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[var(--text-h)]">Tax</dt>
            <dd className="tabular-nums font-medium text-[var(--text-h)]">
              {formatMoneyAmount(taxTotal, cur)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[var(--text-h)]">Tip</dt>
            <dd className="tabular-nums font-medium text-[var(--text-h)]">
              {formatMoneyAmount(tipTotal, cur)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <dt className="text-[var(--text-h)]">Total</dt>
            <dd className="tabular-nums font-medium text-[var(--text-h)]">
              {formatMoneyAmount(total, cur)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--border)] pt-2">
            <dt className="font-medium text-[var(--text-h)]">Grand total</dt>
            <dd className="tabular-nums text-base font-semibold text-[var(--text-h)]">
              {formatMoneyAmount(grandTotal, cur)}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
