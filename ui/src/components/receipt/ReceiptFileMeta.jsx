/**
 * @param {{
 *   originalFilename: string | null | undefined,
 *   storedFilename: string,
 *   mimetype: string,
 *   sizeBytes: number,
 * }} props
 */
export function ReceiptFileMeta({
  originalFilename,
  storedFilename,
  mimetype,
  sizeBytes,
}) {
  return (
    <dl className="space-y-2 text-sm text-[var(--text)]">
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-[var(--text-h)]">Original filename</dt>
        <dd className="font-mono text-xs">{originalFilename || "—"}</dd>
      </div>
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-[var(--text-h)]">Stored as</dt>
        <dd className="break-all font-mono text-xs">{storedFilename}</dd>
      </div>
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-[var(--text-h)]">Type</dt>
        <dd>{mimetype}</dd>
      </div>
      <div className="flex flex-wrap gap-x-2">
        <dt className="text-[var(--text-h)]">Size</dt>
        <dd>{(sizeBytes / 1024).toFixed(1)} KB</dd>
      </div>
    </dl>
  );
}
