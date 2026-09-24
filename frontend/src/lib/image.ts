/** Center-crops an image to a square and re-encodes it as a small JPEG, so a
 * multi-megabyte phone photo becomes a ~50 KB avatar before it's uploaded.
 * Transparent areas are flattened onto white. Throws if the browser can't
 * decode the file. */
export async function resizeToSquareJpeg(
  file: File,
  size = 512,
  quality = 0.9
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const target = Math.min(size, side);

  const canvas = document.createElement("canvas");
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas isn't available.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    target,
    target
  );
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the image."))),
      "image/jpeg",
      quality
    );
  });
}
