/**
 * Zero-Knowledge Client-Side Cryptographic Utilities.
 * Uses native WebCrypto API (AES-256-GCM + PBKDF2) with 0 third-party dependencies.
 * All encrypted cards live purely in the URL hash fragment (#data=...).
 */

export interface EncryptedPayload {
  to: string;
  from: string;
  relation: string;
  message: string;
  shagunAmount?: string;
  rakhiDesign?: string;
  siblingVoucher?: string;
  date: string;
}

interface CompactPayload {
  t: string; // to
  f: string; // from
  r: string; // relation
  m: string; // message
  s?: string; // shagunAmount
  k?: string; // rakhiDesign
  v?: string; // siblingVoucher
  d: string; // date
}

async function compressBuffer(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(data as unknown as BufferSource);
      writer.close();
      const chunks: Uint8Array[] = [];
      const reader = cs.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
      const res = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        res.set(c, offset);
        offset += c.length;
      }
      return res;
    } catch {
      return data;
    }
  }
  return data;
}

async function decompressBuffer(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(data as unknown as BufferSource);
      writer.close();
      const chunks: Uint8Array[] = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
      const res = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        res.set(c, offset);
        offset += c.length;
      }
      return res;
    } catch {
      return data;
    }
  }
  return data;
}

// Convert Buffer to Base64URL string
function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Convert Base64URL string to Uint8Array
function base64UrlToBuf(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive AES-256 Key from Secret Passphrase using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 20000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a payload into a secure compact string token
 */
export async function encryptCapsule(payload: EncryptedPayload, secretKey: string): Promise<string> {
  const enc = new TextEncoder();
  const compact: CompactPayload = {
    t: payload.to,
    f: payload.from,
    r: payload.relation,
    m: payload.message,
    s: payload.shagunAmount,
    k: payload.rakhiDesign,
    v: payload.siblingVoucher,
    d: payload.date,
  };

  const rawJson = enc.encode(JSON.stringify(compact));
  const compressed = await compressBuffer(rawJson);

  const salt = window.crypto.getRandomValues(new Uint8Array(8));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secretKey, salt);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    compressed as unknown as BufferSource
  );

  // Bundle format: salt(8) + iv(12) + ciphertext
  const bundle = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  bundle.set(salt, 0);
  bundle.set(iv, salt.length);
  bundle.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return bufToBase64Url(bundle.buffer);
}

/**
 * Decrypts a token back into the payload
 */
export async function decryptCapsule(token: string, secretKey: string): Promise<EncryptedPayload> {
  const bundle = base64UrlToBuf(token);
  
  // Support both new 8-byte salt (20 bytes header) and legacy 16-byte salt (28 bytes header)
  let saltLen = 8;
  let ivLen = 12;
  
  let key = await deriveKey(secretKey, bundle.slice(0, saltLen));
  let decrypted: ArrayBuffer | null = null;

  try {
    decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bundle.slice(saltLen, saltLen + ivLen) as unknown as BufferSource,
      },
      key,
      bundle.slice(saltLen + ivLen) as unknown as BufferSource
    );
  } catch {
    // Try legacy 16-byte salt
    saltLen = 16;
    key = await deriveKey(secretKey, bundle.slice(0, saltLen));
    decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: bundle.slice(saltLen, saltLen + ivLen) as unknown as BufferSource,
      },
      key,
      bundle.slice(saltLen + ivLen) as unknown as BufferSource
    );
  }

  const dec = new TextDecoder();
  const decompressed = await decompressBuffer(new Uint8Array(decrypted));
  const jsonStr = dec.decode(decompressed);
  const parsed = JSON.parse(jsonStr);

  // Map compact keys back if needed
  if ('t' in parsed) {
    const c = parsed as CompactPayload;
    return {
      to: c.t,
      from: c.f,
      relation: c.r,
      message: c.m,
      shagunAmount: c.s,
      rakhiDesign: c.k,
      siblingVoucher: c.v,
      date: c.d,
    };
  }

  return parsed as EncryptedPayload;
}
