const formats = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
} as const;

export async function validateImageUpload(file: File, maxBytes = 10 * 1024 * 1024) {
  if (!file.size || file.size > maxBytes) throw new Error(`La imagen debe pesar como máximo ${Math.floor(maxBytes / 1024 / 1024)} MB.`);
  if (!(file.type in formats)) throw new Error("Selecciona una imagen JPG, PNG, WebP o GIF. Los archivos SVG y HTML no están permitidos.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  const valid = file.type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.type === "image/png" ? [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte)
    : file.type === "image/webp" ? text.slice(0, 4) === "RIFF" && text.slice(8, 12) === "WEBP"
    : text.startsWith("GIF87a") || text.startsWith("GIF89a");
  if (!valid) throw new Error("El contenido del archivo no corresponde al formato de imagen indicado.");
  return formats[file.type as keyof typeof formats];
}
