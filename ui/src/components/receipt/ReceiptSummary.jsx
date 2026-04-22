import { formatMoneyAmount } from "../../utils/formatMoney.js";

/**
 * @param {{
 *   merchantName: string | null | undefined,
 *   transactionDate: string | null | undefined,
 *   currency: string | null | undefined,
 *   subtotal: number | null | undefined,
 *   taxTotal: number | null | undefined,
 *   tipTotal: number | null | undefined,
 *   miscellaneousChargesTotal: number | null | undefined,
 *   total: number | null | undefined,
 *   grandTotal: number | null | undefined,
 *   splitPartySize: number | null | undefined,
 * }} props
 */
export function ReceiptSummary({
  merchantName,
  transactionDate,
  currency,
  subtotal,
  taxTotal,
  tipTotal,
  miscellaneousChargesTotal,
  total,
  grandTotal,
  splitPartySize,
}) {
  const splitN = (() => {
    const n = Number(splitPartySize);
    return Number.isInteger(n) && n >= 1 ? n : null;
  })();
  const hasMeta =
    !!merchantName ||
    !!transactionDate ||
    !!currency ||
    splitN != null;
  const hasTotals =
    subtotal != null ||
    taxTotal != null ||
    tipTotal != null ||
    miscellaneousChargesTotal != null ||
    total != null ||
    grandTotal != null;

  if (!hasMeta && !hasTotals) {
    return null;
  }

  const showSplitRow = splitN != null;

  const cur = currency;

  return (
    <section
      className="card card-border bg-base-200 border-base-300 mb-8 shadow-md"
      aria-labelledby="receipt-summary-heading"
    >
      <div className="card-body gap-0 text-left">
        <h2 id="receipt-summary-heading" className="mb-3 text-lg font-semibold">
          Summary
        </h2>
        {hasMeta ? (
          <dl className="text-base-content mb-4 space-y-2 border-b border-base-300 pb-4 text-sm">
            {merchantName ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium opacity-90">Merchant</dt>
                <dd>{merchantName}</dd>
              </div>
            ) : null}
            {transactionDate ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium opacity-90">Transaction date</dt>
                <dd>{transactionDate}</dd>
              </div>
            ) : null}
            {currency ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium opacity-90">Currency</dt>
                <dd>{currency}</dd>
              </div>
            ) : null}
            {showSplitRow ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium opacity-90">Split between</dt>
                <dd>
                  {splitN} {splitN === 1 ? "person" : "people"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {hasTotals ? (
          <dl className="text-base-content space-y-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium opacity-90">Subtotal</dt>
              <dd className="tabular-nums font-medium">{formatMoneyAmount(subtotal, cur)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium opacity-90">Tax</dt>
              <dd className="tabular-nums font-medium">{formatMoneyAmount(taxTotal, cur)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium opacity-90">Tip</dt>
              <dd className="tabular-nums font-medium">{formatMoneyAmount(tipTotal, cur)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium opacity-90">Miscellaneous</dt>
              <dd className="tabular-nums font-medium">
                {formatMoneyAmount(miscellaneousChargesTotal, cur)}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="font-medium opacity-90">Total</dt>
              <dd className="tabular-nums font-medium">{formatMoneyAmount(total, cur)}</dd>
            </div>
            <div className="border-base-300 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-2">
              <dt className="font-medium">Grand total</dt>
              <dd className="text-base-content tabular-nums text-base font-semibold">
                {formatMoneyAmount(grandTotal, cur)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
