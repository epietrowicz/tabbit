import { useId, useState } from "react";
import { API_BASE } from "../api.js";

/**
 * @param {{
 *   receiptId: number,
 *   onClaimPosted?: (message: {
 *     id: number,
 *     body: string,
 *     claimer_name?: string | null,
 *     created_at: string,
 *     claims: Array<unknown>,
 *     claimParseError?: string,
 *   }) => void,
 * }} props
 */
export function ReceiptClaimForm({ receiptId, onClaimPosted }) {
  const headingId = useId();
  const formId = useId();
  const [claimerName, setClaimerName] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

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
          body: JSON.stringify({
            message: text,
            ...(claimerName.trim() ? { name: claimerName.trim() } : {}),
          }),
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
        onClaimPosted?.(next);
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
      className="card card-border bg-base-200 border-base-300 mb-8 shadow-md"
      aria-labelledby={headingId}
    >
      <div className="card-body gap-0 text-left">
        <h2 id={headingId} className="mb-1 text-lg font-semibold">
          Add a claim
        </h2>
        <p className="text-base-content/80 mb-4 text-sm">
          Say in your own words what you ordered or what you are paying for. The
          server maps your text to receipt lines (including partial quantities).
          You can send multiple messages.
        </p>

        <form id={formId} onSubmit={handleSubmit} className="space-y-2">
          <div className="form-control w-full">
            <label className="label py-1" htmlFor={`${formId}-name`}>
              <span className="label-text text-sm">Your name</span>
            </label>
            <input
              id={`${formId}-name`}
              name="claimerName"
              type="text"
              autoComplete="name"
              maxLength={200}
              value={claimerName}
              onChange={(e) => setClaimerName(e.target.value)}
              disabled={sending}
              placeholder="e.g. Alex"
              className="input input-bordered w-full"
            />
          </div>
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
            placeholder='e.g. "I had the burger and split the appetizer three ways."'
            className="textarea textarea-bordered w-full resize-y text-base-content placeholder:opacity-50"
          />
          {sendError ? (
            <div role="alert" className="alert alert-error text-sm">
              <span>{sendError}</span>
            </div>
          ) : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="btn btn-primary"
            >
              {sending ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Sending…
                </>
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
