import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../api.js";

export default function ReceiptUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [receipts, setReceipts] = useState([]);

  const loadReceipts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/receipts?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setReceipts(data.receipts ?? []);
    } catch {
      /* ignore list errors */
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Choose a receipt image first.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Upload failed (${res.status})`);
        return;
      }
      const receiptId = data.id;
      if (receiptId == null) {
        setError(
          "Upload succeeded but the server did not return a receipt id.",
        );
        return;
      }
      setFile(null);
      const input = document.getElementById("receipt-input");
      if (input) input.value = "";
      await loadReceipts();
      navigate(`/receipts/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error — is the API running?",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-10 text-left">
      <h1 className="mb-2 text-center text-3xl font-medium tracking-tight text-[var(--text-h)]">
        Receipt upload
      </h1>
      <p className="mb-8 text-center text-[var(--text)]">
        Upload a photo of a receipt. It is stored on the server and recorded in
        the database with a timestamp.
      </p>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-[var(--shadow)]"
      >
        <label
          htmlFor="receipt-input"
          className="mb-2 block text-sm font-medium text-[var(--text-h)]"
        >
          Receipt image
        </label>
        <input
          id="receipt-input"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          className="mb-4 block w-full text-sm text-[var(--text)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--accent-bg)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--text-h)] hover:file:bg-[var(--accent-border)]"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError(null);
          }}
          disabled={uploading}
        />

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? "Uploading…" : "Upload receipt"}
        </button>

        {error ? (
          <p
            className="mt-4 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>

      {receipts.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-medium text-[var(--text-h)]">
            Recent receipts
          </h2>
          <ul className="space-y-2 text-sm text-[var(--text)]">
            {receipts.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/receipts/${r.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 transition-colors hover:border-[var(--accent-border)] hover:bg-[var(--code-bg)]"
                >
                  <span className="font-mono text-xs text-[var(--text-h)]">
                    #{r.id}
                  </span>
                  <span className="text-xs">{r.created_at}</span>
                  <span className="w-full truncate text-xs opacity-80">
                    {r.original_filename || r.stored_filename} ·{" "}
                    {(r.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
