import { Link } from "react-router-dom";

/**
 * @param {{ receiptId: number, createdAt: string }} props
 */
export function ReceiptDetailHeader({ receiptId, createdAt }) {
  return (
    <>
      <p className="mb-4">
        <Link
          to="/"
          className="text-sm text-[var(--text)] underline-offset-4 hover:text-[var(--text-h)] hover:underline"
        >
          ← Upload
        </Link>
      </p>
      <h1 className="mb-2 text-3xl font-medium tracking-tight text-[var(--text-h)]">
        Receipt #{receiptId}
      </h1>
      <p className="mb-6 text-sm text-[var(--text)]">{createdAt}</p>
    </>
  );
}
