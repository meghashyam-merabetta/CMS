export const MAX_JSON_REQUEST_BYTES = 16 * 1024;
export const MAX_PRODUCT_JSON_REQUEST_BYTES = 128 * 1024;

export function assertJsonRequestSize(
  body: string,
  maxBytes: number = MAX_JSON_REQUEST_BYTES
): void {
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    const kib = Math.round(maxBytes / 1024);
    throw new Error(
      `This request exceeds the ${kib} KiB limit. Shorten long descriptions or remove some entries and try again.`
    );
  }
}
