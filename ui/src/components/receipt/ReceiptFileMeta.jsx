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
    <section className="card card-border bg-base-200 border-base-300 mb-8 shadow-md">
      <div className="card-body py-4 text-left">
        <h2 className="mb-3 text-lg font-semibold">File</h2>
        <dl className="text-base-content space-y-2 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium opacity-90">Original filename</dt>
            <dd className="font-mono text-xs">{originalFilename || "—"}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium opacity-90">Stored as</dt>
            <dd className="break-all font-mono text-xs">{storedFilename}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium opacity-90">Type</dt>
            <dd>{mimetype}</dd>
          </div>
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium opacity-90">Size</dt>
            <dd>{(sizeBytes / 1024).toFixed(1)} KB</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
