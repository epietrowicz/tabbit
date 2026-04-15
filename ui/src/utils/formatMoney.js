/**
 * @param {unknown} amount
 * @param {string | null | undefined} currency
 */
export function formatMoneyAmount(amount, currency) {
  if (amount == null) {
    return "—";
  }
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return "—";
  }
  const formatted = n.toFixed(2);
  const c = typeof currency === "string" && currency.trim() ? currency.trim() : "";
  return c ? `${formatted} ${c}` : formatted;
}
