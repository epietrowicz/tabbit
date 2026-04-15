import { OpenAIProvider } from "@launchdarkly/server-sdk-ai-openai";
import { aiClient } from "../ld.js";

/**
 * Structured output: map plain-text claims to receipt line item ids from the DB.
 * quantityClaimed may be fractional (e.g. 0.5 of a shared line with quantity 1).
 */
const CLAIM_PARSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    allocations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          lineItemId: { type: "integer" },
          quantityClaimed: { type: "number" },
          notes: { type: "string" },
        },
        required: ["lineItemId", "quantityClaimed", "notes"],
      },
    },
  },
  required: ["allocations"],
};

const defaultLdContext = { kind: "user", key: "claim-parser" };
const defaultAIAgentConfig = {
  enabled: true,
  model: { name: "gpt-4o" },
  provider: { name: "openai" },
  instructions:
    "You map informal text about who ordered what to receipt line items identified by numeric ids. " +
    "quantityClaimed is how much of that line applies (use fractions like 0.5 for half of a shared item). " +
    "Never exceed the line's quantity. If nothing matches, return an empty allocations array. " +
    "Use notes for a short rationale or empty string.",
};

/**
 * @param {Array<{ lineItemId: number, quantityClaimed: number, notes?: string }>} rawAllocations
 * @param {Array<{ id: number, quantity: number, unit_price: number, line_total: number, description: string }>} lineItems
 * @returns {Array<{ receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number }>}
 */
export function buildReceiptClaimRows(rawAllocations, lineItems) {
  const byId = new Map(lineItems.map((li) => [li.id, li]));
  /** @type {Map<number, number>} */
  const qtyByLine = new Map();

  for (const a of rawAllocations) {
    const id = Number(a.lineItemId);
    const li = byId.get(id);
    if (!li) {
      continue;
    }
    let q = Number(a.quantityClaimed);
    if (!Number.isFinite(q) || q <= 0) {
      continue;
    }
    const lineQty = Number(li.quantity);
    if (!Number.isFinite(lineQty) || lineQty <= 0) {
      continue;
    }
    q = Math.min(q, lineQty);
    const prev = qtyByLine.get(id) ?? 0;
    qtyByLine.set(id, Math.min(prev + q, lineQty));
  }

  const rows = [];
  for (const [id, q] of qtyByLine) {
    const li = byId.get(id);
    if (!li) {
      continue;
    }
    const unit = Number(li.unit_price);
    const lineTotal = Number(li.line_total);
    if (!Number.isFinite(unit) || !Number.isFinite(lineTotal)) {
      continue;
    }
    let allocated = Math.round(q * unit * 100) / 100;
    allocated = Math.min(allocated, lineTotal);
    rows.push({
      receipt_line_item_id: id,
      quantity_claimed: q,
      allocated_amount: allocated,
    });
  }
  return rows;
}

/**
 * Uses the LaunchDarkly AI agent `claim-itemizer` to turn plain text into allocations,
 * then computes costs from line item unit prices (capped by each line total).
 *
 * @param {string} plainText
 * @param {Array<{ id: number, line_index: number, description: string, quantity: number, unit_price: number, line_total: number }>} lineItems
 * @returns {Promise<{ allocations: Array<{ lineItemId: number, quantityClaimed: number, notes: string }>, claimRows: ReturnType<typeof buildReceiptClaimRows> }>}
 */
export async function parsePlainTextToReceiptClaims(plainText, lineItems) {
  if (!plainText.trim()) {
    return { allocations: [], claimRows: [] };
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { allocations: [], claimRows: [] };
  }

  const agentConfig = await aiClient.agentConfig(
    "claim-itemizer",
    defaultLdContext,
    defaultAIAgentConfig,
  );

  if (!agentConfig.enabled || !agentConfig.tracker) {
    throw new Error("Claim itemizer AI config is disabled or missing a tracker.");
  }

  const provider = await OpenAIProvider.create(agentConfig);

  const payload = {
    task:
      "Given the receipt line items (with database ids) and the user's plain-text claim, output which lines they are claiming and in what quantity.",
    lineItems: lineItems.map((li) => ({
      id: li.id,
      lineIndex: li.line_index,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unit_price,
      lineTotal: li.line_total,
    })),
    userClaim: plainText,
  };

  const systemText =
    agentConfig.instructions ??
    defaultAIAgentConfig.instructions;

  const messages = [
    { role: "system", content: systemText },
    {
      role: "user",
      content: JSON.stringify(payload),
    },
  ];

  const { data, metrics } = await agentConfig.tracker.trackMetricsOf(
    (result) => result.metrics,
    () => provider.invokeStructuredModel(messages, CLAIM_PARSE_SCHEMA),
  );

  if (!metrics.success) {
    throw new Error("Claim structured model invocation did not succeed.");
  }

  const raw = /** @type {{ allocations?: Array<{ lineItemId?: number, quantityClaimed?: number, notes?: string }> }} */ (
    data
  );
  const allocations = Array.isArray(raw.allocations)
    ? raw.allocations.map((a) => ({
        lineItemId: Number(a.lineItemId),
        quantityClaimed: Number(a.quantityClaimed),
        notes: typeof a.notes === "string" ? a.notes : "",
      }))
    : [];

  const claimRows = buildReceiptClaimRows(allocations, lineItems);
  return { allocations, claimRows };
}
