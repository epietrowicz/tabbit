import { useEffect, useId, useState } from "react";
import { API_BASE } from "../../api.js";
import { formatMoneyAmount } from "../../utils/formatMoney.js";

/**
 * @param {{
 *   receiptId: number,
 *   currency: string | null | undefined,
 *   initialMessages: Array<{
 *     id: number,
 *     body: string,
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
 *   }>,
 * }} props
 */
export function ReceiptClaimChat({ receiptId, currency, initialMessages }) {
  const headingId = useId();
  const formId = useId();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [receiptId, initialMessages]);

  async function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(
        `${API_BASE}/receipts/${encodeURIComponent(String(receiptId))}/claims`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(
          typeof data.error === "string"
            ? data.error
            : `Request failed (${res.status})`,
        );
        return;
      }
      if (data.message && typeof data.message === "object") {
        const next = {
          ...data.message,
          claims: Array.isArray(data.claims) ? data.claims : [],
          claimParseError:
            typeof data.claimParseError === "string"
              ? data.claimParseError
              : undefined,
        };
        setMessages((prev) => [...prev, next]);
      }
      setDraft("");
    } catch (err) {
      setSendError(
        err instanceof Error
          ? err.message
          : "Network error — is the API running?",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--social-bg)] p-4 shadow-[var(--shadow)]"
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-1 text-lg font-medium text-[var(--text-h)]"
      >
        Claim items
      </h2>
      <p className="mb-4 text-sm text-[var(--text)]">
        Say in your own words what you ordered or what you are paying for. The
        server maps your text to receipt lines (including partial quantities).
        You can send multiple messages.
      </p>

      <div
        className="mb-4 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--code-bg)] p-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--text)] opacity-80">
            No claims yet — add a message below.
          </p>
        ) : (
          messages.map((m) => (
            <article
              key={m.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] shadow-sm"
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {m.body}
              </p>
              <p className="mt-1 text-xs text-[var(--text)] opacity-60">
                {m.created_at}
              </p>
              {m.claimParseError ? (
                <p
                  className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-amber-700 dark:text-amber-400"
                  role="status"
                >
                  Line matching failed: {m.claimParseError}
                </p>
              ) : null}
              {m.claims && m.claims.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-[var(--border)] pt-2 text-xs text-[var(--text)]">
                  {m.claims.map((c) => (
                    <li key={c.id}>
                      <span className="font-medium text-[var(--text-h)]">
                        {c.line_description ?? `Line #${c.line_index ?? "?"}`}
                      </span>
                      <span className="opacity-80">
                        {" "}
                        — qty {c.quantity_claimed} →{" "}
                        <span className="tabular-nums font-medium text-[var(--text-h)]">
                          {formatMoneyAmount(c.allocated_amount, currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </div>

      <form id={formId} onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor={`${formId}-input`} className="sr-only">
          Your claim
        </label>
        <textarea
          id={`${formId}-input`}
          name="message"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={sending}
          placeholder='e.g. "I had the burger and split the appetizer with Sam."'
          className="w-full resize-y rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text)] placeholder:opacity-50 focus:border-[var(--accent-border)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-border)] disabled:opacity-60"
        />
        {sendError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {sendError}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
