/**
 * @param {{ imageUrl: string }} props
 */
export function ReceiptImage({ imageUrl }) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--code-bg)] shadow-[var(--shadow)]">
      <img
        src={imageUrl}
        alt=""
        className="max-h-[min(70vh,560px)] w-full object-contain"
      />
    </div>
  );
}
