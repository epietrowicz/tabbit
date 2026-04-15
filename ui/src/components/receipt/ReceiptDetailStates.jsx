import { Link } from "react-router-dom";

export function ReceiptDetailLoading() {
  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center text-[var(--text)]">
      Loading receipt…
    </div>
  );
}

/**
 * @param {{ receiptId: string }} props
 */
export function ReceiptNotFound({ receiptId }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-center">
      <h1 className="mb-2 text-2xl font-medium text-[var(--text-h)]">
        Receipt not found
      </h1>
      <p className="mb-6 text-[var(--text)]">
        There is no receipt with id{" "}
        <code className="text-[var(--text-h)]">{receiptId}</code>.
      </p>
      <Link
        to="/"
        className="text-[var(--accent)] underline-offset-2 hover:underline"
      >
        Back to upload
      </Link>
    </div>
  );
}

/**
 * @param {{ message: string }} props
 */
export function ReceiptLoadError({ message }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-center">
      <p className="mb-4 text-red-600 dark:text-red-400" role="alert">
        {message}
      </p>
      <Link
        to="/"
        className="text-[var(--accent)] underline-offset-2 hover:underline"
      >
        Back to upload
      </Link>
    </div>
  );
}
