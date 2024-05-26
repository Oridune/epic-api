export enum SupportedHashAlg {
  SHA_1 = "SHA-1",
  SHA_256 = "SHA-256",
  SHA_384 = "SHA-384",
  SHA_512 = "SHA-512",
}

export const createHash = async (alg: SupportedHashAlg, data: string) => {
  const DataUint8 = new TextEncoder().encode(data);

  const Hash = Array.from(
    new Uint8Array(await crypto.subtle.digest(alg, DataUint8)),
  );

  return Hash.map((b) => b.toString(16).padStart(2, "0")).join("");
};
