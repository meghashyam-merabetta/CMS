export const MAX_JSON_REQUEST_BYTES = 16 * 1024;

export function assertJsonRequestSize(body: string): void {
  if (new TextEncoder().encode(body).byteLength > MAX_JSON_REQUEST_BYTES) {
    throw new Error('This request exceeds the 16 KiB limit. Shorten long descriptions or remove some entries and try again.');
  }
}
