import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../api.js";

export default function ReceiptUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  /** String so the field can be cleared while typing; validated on blur / submit. */
  const [splitPartySizeInput, setSplitPartySizeInput] = useState("2");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [receipts, setReceipts] = useState([]);

  const loadReceipts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/receipts?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setReceipts(data.receipts ?? []);
    } catch (err) {
      console.error(err);
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
    const splitPartySizeParsed = Number.parseInt(splitPartySizeInput, 10);
    const splitPartySize =
      Number.isInteger(splitPartySizeParsed) &&
      splitPartySizeParsed >= 1 &&
      splitPartySizeParsed <= 100
        ? splitPartySizeParsed
        : 1;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("split_party_size", String(splitPartySize));
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
    <div className="container mx-auto max-w-xl px-5 py-10 text-left">
      <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight">
        Receipt upload
      </h1>
      <p className="text-base-content/80 mb-8 text-center">
        Upload a photo of a receipt. It is stored on the server and recorded in
        the database with a timestamp.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card border-base-300 bg-base-100 border shadow-md">
          <div className="card-body gap-4">
            <div className="form-control w-full">
              <label className="label px-0 pt-0" htmlFor="receipt-input">
                <span className="label-text font-medium">Receipt image</span>
              </label>
              <input
                id="receipt-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="file-input file-input-bordered w-full"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                disabled={uploading}
              />
            </div>

            <div className="form-control w-full">
              <label className="label px-0 pt-0" htmlFor="split-party-size">
                <span className="label-text font-medium">
                  Split between how many people?
                </span>
              </label>
              <input
                id="split-party-size"
                type="number"
                min={1}
                max={100}
                step={1}
                inputMode="numeric"
                value={splitPartySizeInput}
                onChange={(e) => {
                  setSplitPartySizeInput(e.target.value);
                  setError(null);
                }}
                onBlur={() => {
                  const n = Number.parseInt(splitPartySizeInput, 10);
                  if (
                    splitPartySizeInput.trim() === "" ||
                    !Number.isInteger(n) ||
                    n < 1
                  ) {
                    setSplitPartySizeInput("1");
                  } else {
                    setSplitPartySizeInput(String(Math.min(n, 100)));
                  }
                }}
                disabled={uploading}
                className="input input-bordered w-full"
              />
              <span className="label-text-alt text-base-content/70 mt-1 block">
                Includes you — use 1 if you are not splitting with anyone.
              </span>
            </div>

            <button
              type="submit"
              disabled={uploading || !file}
              className="btn btn-primary w-full"
            >
              {uploading ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Uploading…
                </>
              ) : (
                "Upload receipt"
              )}
            </button>

            {error ? (
              <div role="alert" className="alert alert-error text-sm">
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>
      </form>

      {receipts.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Recent receipts</h2>
          <ul className="flex flex-col gap-2">
            {receipts.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/receipts/${r.id}`}
                  className="card card-border bg-base-200 border-base-300 hover:border-primary/40 block border transition-colors"
                >
                  <div className="card-body gap-1 px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-xs opacity-90">
                        #{r.id}
                      </span>
                      <span className="text-xs opacity-70">{r.created_at}</span>
                    </div>
                    <span className="text-base-content/80 w-full truncate text-xs">
                      {r.original_filename || r.stored_filename} ·{" "}
                      {(r.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
