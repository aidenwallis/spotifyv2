export function getSha256(v: string) {
  return crypto.subtle.digest({ name: "SHA-256" }, new TextEncoder().encode(v)).then((dig) => arrToHex(new Uint8Array(dig)));
}

export function randomToken(length: number) {
  return arrToHex(crypto.getRandomValues(new Uint8Array(length)));
}

export function arrToHex(v: Uint8Array) {
  return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasBits<T extends bigint | number>(sum: T, bit: T) {
  return (sum & bit) === bit;
}
