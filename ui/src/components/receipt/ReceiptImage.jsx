/**
 * @param {{ imageUrl: string }} props
 */
export function ReceiptImage({ imageUrl }) {
  return (
    <div className="card card-border bg-base-200 border-base-300 mb-6 overflow-hidden shadow-md">
      <figure className="m-0">
        <img
          src={imageUrl}
          alt=""
          className="max-h-[min(70vh,560px)] w-full object-contain"
        />
      </figure>
    </div>
  );
}
