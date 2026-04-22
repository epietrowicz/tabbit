/**
 * Joins claim messages with their line-allocation rows for display.
 *
 * @param {{ claim_messages?: unknown, receipt_claims?: unknown } | null | undefined} receipt
 * @returns {Array<{
 *   id: number,
 *   body: string,
 *   claimer_name?: string | null,
 *   created_at: string,
 *   claims: Array<unknown>,
 * }>}
 */
export function mergeClaimMessages(receipt) {
  if (!receipt) {
    return [];
  }
  const msgs = Array.isArray(receipt.claim_messages)
    ? receipt.claim_messages
    : [];
  const claims = Array.isArray(receipt.receipt_claims)
    ? receipt.receipt_claims
    : [];
  /** @type {Map<number, typeof claims>} */
  const byMsg = new Map();
  for (const c of claims) {
    const mid = c.receipt_claim_message_id;
    const list = byMsg.get(mid);
    if (list) {
      list.push(c);
    } else {
      byMsg.set(mid, [c]);
    }
  }
  return msgs.map((m) => ({
    ...m,
    claims: byMsg.get(m.id) ?? [],
  }));
}
