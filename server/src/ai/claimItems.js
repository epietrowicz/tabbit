import { aiClient } from "../ld.js";
import { ChatOpenAI } from "@langchain/openai";
import { LangChainProvider } from "@launchdarkly/server-sdk-ai-langchain";
import { mapAiConfigTools } from "./toolsHelper.js";
import { AIMessage, createAgent, HumanMessage, initChatModel } from "langchain";

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
 * @param {unknown} v
 * @returns {number}
 */
function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * @param {number} n
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Equal share of tax, tip, and unitemized subtotal gap for one diner (split_party_size ways).
 * Stored on the claim message, not on line rows.
 *
 * @param {Array<{ line_total: number }>} lineItems
 * @param {{
 *   subtotal?: number | null,
 *   tax_total?: number | null,
 *   tip_total?: number | null,
 *   split_party_size?: number | null,
 * } | null | undefined} receiptTotals
 * @param {boolean} hasClaimRows
 */
function computeSharedOverheadAmount(lineItems, receiptTotals, hasClaimRows) {
  if (!hasClaimRows || !receiptTotals) {
    return 0;
  }

  const linesSum = lineItems.reduce((s, li) => s + numOrZero(li.line_total), 0);
  if (linesSum <= 0) {
    return 0;
  }

  const tax = numOrZero(receiptTotals.tax_total);
  const tip = numOrZero(receiptTotals.tip_total);
  const subtotalRaw = receiptTotals.subtotal;
  const sub =
    subtotalRaw != null && subtotalRaw !== ""
      ? numOrZero(subtotalRaw)
      : linesSum;
  const unitemized = Math.max(0, sub - linesSum);
  const sharedPool = tax + tip + unitemized;

  const nRaw = Number(receiptTotals.split_party_size);
  const partySize =
    Number.isFinite(nRaw) && nRaw >= 1
      ? Math.min(Math.max(Math.round(nRaw), 1), 100)
      : 1;
  const perDiner = sharedPool / partySize;
  return perDiner > 0 ? round2(perDiner) : 0;
}

/**
 * @param {Array<{ lineItemId: number, quantityClaimed: number, notes?: string }>} rawAllocations
 * @param {Array<{ id: number, quantity: number, unit_price: number, line_total: number, description: string }>} lineItems
 * @param {{
 *   subtotal?: number | null,
 *   tax_total?: number | null,
 *   tip_total?: number | null,
 *   split_party_size?: number | null,
 * } | null | undefined} [receiptTotals]
 * @returns {{
 *   claimRows: Array<{ receipt_line_item_id: number, quantity_claimed: number, allocated_amount: number }>,
 *   sharedOverheadAmount: number,
 * }}
 */
export function buildReceiptClaimRows(
  rawAllocations,
  lineItems,
  receiptTotals,
) {
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
  const sharedOverheadAmount = computeSharedOverheadAmount(
    lineItems,
    receiptTotals,
    rows.length > 0,
  );
  return { claimRows: rows, sharedOverheadAmount };
}

async function invokeClaimAgent(agent, plainText) {
  const response = await agent.invoke({
    messages: [
      new HumanMessage({
        content: plainText,
      }),
    ],
  });

  const lastAi = response.messages
    .filter((m) => AIMessage.isInstance(m))
    .at(-1);
  if (!lastAi) {
    throw new Error("Claim agent returned no assistant message.");
  }

  return lastAi;
}

export async function parsePlainTextToReceiptClaims(
  plainText,
  lineItems,
  receiptTotals,
) {
  if (!plainText.trim()) {
    return { allocations: [], claimRows: [], sharedOverheadAmount: 0 };
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return { allocations: [], claimRows: [], sharedOverheadAmount: 0 };
  }

  const agentConfig = await aiClient.agentConfig(
    "claim-parser",
    defaultLdContext,
    { enabled: true },
    { line_items: JSON.stringify(lineItems) },
  );

  if (!agentConfig.enabled || !agentConfig.tracker) {
    throw new Error("Claim parser AI config is disabled or missing a tracker.");
  }

  const modelName = agentConfig.model.name;
  const modelTemperature = agentConfig.model.parameters.temperature;

  const model = await initChatModel(modelName, {
    temperature: modelTemperature,
  });

  const { tracker } = agentConfig;

  const agent = createAgent({
    model,
    tools: mapAiConfigTools(agentConfig),
    systemPrompt: agentConfig.instructions,
    responseFormat: agentConfig.model.custom.schema,
  });

  const aiMessage = await tracker.trackMetricsOf(
    LangChainProvider.getAIMetricsFromResponse,
    () => invokeClaimAgent(agent, plainText),
  );

  const data = JSON.parse(aiMessage.text);

  console.log(data);

  const allocations = Array.isArray(data.allocations)
    ? data.allocations.map((a) => ({
        lineItemId: Number(a.lineItemId),
        quantityClaimed: Number(a.quantityClaimed),
        notes: typeof a.notes === "string" ? a.notes : "",
      }))
    : [];

  const { claimRows, sharedOverheadAmount } = buildReceiptClaimRows(
    allocations,
    lineItems,
    receiptTotals,
  );
  return { allocations, claimRows, sharedOverheadAmount };
}
