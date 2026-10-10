const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validatePlaceImages(files: File[]) {
  const invalid = files.find(
    (file) => !imageTypes.has(file.type) || file.size > 10 * 1024 * 1024,
  );
  return invalid
    ? `“${invalid.name}” debe ser JPG, PNG, WebP o GIF y pesar como máximo 10 MB.`
    : "";
}

export function validatePlaceCapacity(min: string, max: string) {
  const values = [min, max].filter((value) => value.trim() !== "").map(Number);
  if (values.some((value) => !Number.isInteger(value) || value < 1))
    return "La capacidad debe ser un número entero mayor que cero.";
  if (min.trim() && max.trim() && Number(min) > Number(max))
    return "La capacidad mínima no puede superar la máxima.";
  return "";
}
