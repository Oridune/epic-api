export enum SupportedHashAlg {
  SHA_1 = "SHA-1",
  SHA_256 = "SHA-256",
  SHA_384 = "SHA-384",
  SHA_512 = "SHA-512",
  sha_1 = "sha-1",
  sha_256 = "sha-256",
  sha_384 = "sha-384",
  sha_512 = "sha-512",
}

export type HashAlg = SupportedHashAlg | AlgorithmIdentifier;

export const createHash = async (
  alg: HashAlg,
  data: string,
) => {
  const DataUint8 = new TextEncoder().encode(data);

  const Hash = Array.from(
    new Uint8Array(await crypto.subtle.digest(alg, DataUint8)),
  );

  return Hash.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export const createHashBase64 = async (alg: HashAlg, data: string) => {
  const DataUint8 = new TextEncoder().encode(data);

  const Hash = String.fromCharCode(
    ...new Uint8Array(await crypto.subtle.digest(alg, DataUint8)),
  );

  return btoa(Hash);
};
