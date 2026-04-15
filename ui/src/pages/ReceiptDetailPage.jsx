import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, fileUrl } from "../api.js";
import { ReceiptClaimChat } from "../components/receipt/ReceiptClaimChat.jsx";
import { ReceiptDetailHeader } from "../components/receipt/ReceiptDetailHeader.jsx";
import {
  ReceiptDetailLoading,
  ReceiptLoadError,
  ReceiptNotFound,
} from "../components/receipt/ReceiptDetailStates.jsx";
import { ReceiptFileMeta } from "../components/receipt/ReceiptFileMeta.jsx";
import { ReceiptImage } from "../components/receipt/ReceiptImage.jsx";
import { ReceiptItemization } from "../components/receipt/ReceiptItemization.jsx";
import { ReceiptLineItems } from "../components/receipt/ReceiptLineItems.jsx";

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setReceipt(null);
      try {
        const res = await fetch(`${API_BASE}/receipts/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404) {
          setError("notfound");
          return;
        }
        if (!res.ok) {
          setError(data.error || `Request failed (${res.status})`);
          return;
        }
        setReceipt(data.receipt);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Network error — is the API running?",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const lineItems = useMemo(
    () =>
      receipt && Array.isArray(receipt.line_items) ? receipt.line_items : [],
    [receipt?.line_items],
  );

  const claimMessagesWithClaims = useMemo(() => {
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
  }, [receipt]);

  if (loading) {
    return <ReceiptDetailLoading />;
  }

  if (error === "notfound") {
    return <ReceiptNotFound receiptId={String(id)} />;
  }

  if (error || !receipt) {
    return (
      <ReceiptLoadError
        message={error || "Something went wrong."}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-left">
      <ReceiptDetailHeader
        receiptId={receipt.id}
        createdAt={receipt.created_at}
      />

      <ReceiptImage imageUrl={fileUrl(receipt.url)} />

      <ReceiptItemization
        merchantName={receipt.merchant_name}
        transactionDate={receipt.transaction_date}
        currency={receipt.currency}
        subtotal={receipt.subtotal}
        taxTotal={receipt.tax_total}
        tipTotal={receipt.tip_total}
        total={receipt.total}
        grandTotal={receipt.grand_total}
      />

      <ReceiptLineItems
        lineItems={lineItems}
        mimetype={receipt.mimetype}
        currency={receipt.currency}
      />

      <ReceiptFileMeta
        originalFilename={receipt.original_filename}
        storedFilename={receipt.stored_filename}
        mimetype={receipt.mimetype}
        sizeBytes={receipt.size_bytes}
      />

      <ReceiptClaimChat
        receiptId={receipt.id}
        currency={receipt.currency}
        initialMessages={claimMessagesWithClaims}
      />
    </div>
  );
}
