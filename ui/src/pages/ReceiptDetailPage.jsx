import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE, fileUrl } from "../api.js";
import { ReceiptClaimedItems } from "../components/ReceiptClaimedItems.jsx";
import { ReceiptClaimForm } from "../components/ReceiptClaimForm.jsx";
import { ReceiptDetailHeader } from "../components/receipt/ReceiptDetailHeader.jsx";
import {
  ReceiptDetailLoading,
  ReceiptLoadError,
  ReceiptNotFound,
} from "../components/receipt/ReceiptDetailStates.jsx";
import { ReceiptImage } from "../components/receipt/ReceiptImage.jsx";
import { ReceiptSummary } from "../components/receipt/ReceiptSummary.jsx";
import { ReceiptLineItems } from "../components/receipt/ReceiptLineItems.jsx";
import { mergeClaimMessages } from "../utils/mergeClaimMessages.js";

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimMessages, setClaimMessages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setReceipt(null);
      try {
        const res = await fetch(
          `${API_BASE}/receipts/${encodeURIComponent(id)}`,
        );
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
    [receipt],
  );

  const claimMessagesFromReceipt = useMemo(
    () => mergeClaimMessages(receipt),
    [receipt],
  );

  useEffect(() => {
    setClaimMessages(claimMessagesFromReceipt);
  }, [id, claimMessagesFromReceipt]);

  if (loading) {
    return <ReceiptDetailLoading />;
  }

  if (error === "notfound") {
    return <ReceiptNotFound receiptId={String(id)} />;
  }

  if (error || !receipt) {
    return <ReceiptLoadError message={error || "Something went wrong."} />;
  }

  return (
    <div className="container mx-auto max-w-xl px-5 py-10 text-left">
      <ReceiptDetailHeader
        receiptId={receipt.id}
        createdAt={receipt.created_at}
      />

      <ReceiptImage imageUrl={fileUrl(receipt.url)} />

      <ReceiptSummary
        merchantName={receipt.merchant_name}
        transactionDate={receipt.transaction_date}
        currency={receipt.currency}
        subtotal={receipt.subtotal}
        taxTotal={receipt.tax_total}
        tipTotal={receipt.tip_total}
        miscellaneousChargesTotal={receipt.miscellaneous_charges_total}
        total={receipt.total}
        grandTotal={receipt.grand_total}
        splitPartySize={receipt.split_party_size}
      />

      <ReceiptLineItems
        lineItems={lineItems}
        mimetype={receipt.mimetype}
        currency={receipt.currency}
      />

      <ReceiptClaimedItems
        currency={receipt.currency}
        messages={claimMessages}
        receiptTotalAmount={receipt.grand_total ?? receipt.total ?? null}
      />
      <ReceiptClaimForm
        receiptId={receipt.id}
        onClaimPosted={(msg) => setClaimMessages((prev) => [...prev, msg])}
      />
    </div>
  );
}
