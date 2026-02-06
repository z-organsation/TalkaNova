/**
 * E2EE helpers using TweetNaCl box (X25519 + XSalsa20-Poly1305).
 * Keys and ciphertext are base64 for API transport.
 */

import nacl from "tweetnacl";

const NONCE_LENGTH = 24;

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  return btoa(String.fromCharCode(...bytes));
}

function decodeBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  return new Uint8Array(bin.split("").map((c) => c.charCodeAt(0)));
}

export type KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

export function publicKeyToBase64(pk: Uint8Array): string {
  return encodeBase64(pk);
}

export function base64ToPublicKey(b64: string): Uint8Array {
  return decodeBase64(b64);
}

export function secretKeyToBase64(sk: Uint8Array): string {
  return encodeBase64(sk);
}

export function base64ToSecretKey(b64: string): Uint8Array {
  return decodeBase64(b64);
}

/**
 * Encrypt plaintext for a recipient. Returns base64(nonce || ciphertext).
 * Recipient decrypts with their secret key and sender's public key.
 */
export function encrypt(plaintext: string, recipientPublicKeyB64: string, senderSecretKey: Uint8Array): string {
  const recipientPk = base64ToPublicKey(recipientPublicKeyB64);
  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const message = new TextEncoder().encode(plaintext);
  const ciphertext = nacl.box(message, nonce, recipientPk, senderSecretKey);
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return encodeBase64(combined);
}

/**
 * Decrypt ciphertext (base64(nonce||ciphertext)) using our secret key and sender's public key.
 */
export function decrypt(
  ciphertextB64: string,
  senderPublicKeyB64: string,
  recipientSecretKey: Uint8Array
): string {
  const combined = decodeBase64(ciphertextB64);
  const nonce = combined.slice(0, NONCE_LENGTH);
  const ciphertext = combined.slice(NONCE_LENGTH);
  const senderPk = base64ToPublicKey(senderPublicKeyB64);
  const plaintext = nacl.box.open(ciphertext, nonce, senderPk, recipientSecretKey);
  if (!plaintext) throw new Error("Decryption failed");
  return new TextDecoder().decode(plaintext);
}

// ========== Room Symmetric Encryption (E2EE) ==========

/**
 * Derive a 32-byte key from the room code using PBKDF2 (Web Crypto API).
 * Salt is constant "talkanova_room_salt" for simplicity in this demo,
 * but ideally should be unique per room (and stored/shared).
 */
export async function deriveRoomKey(roomCode: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(roomCode),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const keyBuffer = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode("talkanova_room_salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes * 8 bits
  );

  return new Uint8Array(keyBuffer);
}

/**
 * Encrypt message using XSalsa20-Poly1305 (SecretBox).
 * Returns base64(nonce || ciphertext).
 */
export function encryptRoomMessage(plaintext: string, key: Uint8Array): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const message = new TextEncoder().encode(plaintext);
  const box = nacl.secretbox(message, nonce, key);

  const fullMessage = new Uint8Array(nonce.length + box.length);
  fullMessage.set(nonce);
  fullMessage.set(box, nonce.length);

  return encodeBase64(fullMessage);
}

/**
 * Decrypt message using XSalsa20-Poly1305 (SecretBox).
 * Returns plaintext or null if decryption fails (e.g. wrong room code).
 */
export function decryptRoomMessage(ciphertextB64: string, key: Uint8Array): string | null {
  try {
    const messageWithNonce = decodeBase64(ciphertextB64);
    const nonce = messageWithNonce.slice(0, nacl.secretbox.nonceLength);
    const box = messageWithNonce.slice(nacl.secretbox.nonceLength);

    const decrypted = nacl.secretbox.open(box, nonce, key);

    if (!decrypted) return null; // Decryption failed

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    return null;
  }
}

// Keeping these for fallbacks if needed, but they are DEPRECATED
export function roomOpaqueEncode(plaintext: string): string {
  return encodeBase64(new TextEncoder().encode(plaintext));
}

export function roomOpaqueDecode(ciphertextB64: string): string {
  try {
    return new TextDecoder().decode(decodeBase64(ciphertextB64));
  } catch {
    return ciphertextB64 || "[unable to decrypt]";
  }
}

// ========== X3DH Key Generation for Registration ==========

export type RegistrationKeys = {
  identity_key: string;      // Ed25519 Public Key (Base64)
  signed_pre_key: string;    // X25519 Public Key (Base64)
  pre_key_sig: string;       // Ed25519 Signature of SignedPreKey (Base64)
  one_time_pre_keys: string[]; // List of X25519 Public Keys (Base64)
  // Private keys to store locally
  private_identity_key: string;
  private_signed_pre_key: string;
  private_one_time_keys: string[];
};

export function generateRegistrationKeys(): RegistrationKeys {
  // 1. Identity Key (Ed25519 for Signing)
  const ik = nacl.sign.keyPair();

  // 2. Signed Pre-Key (X25519 for Encryption)
  const spk = nacl.box.keyPair();

  // 3. Sign the SPK Public Key with IK
  const sig = nacl.sign.detached(spk.publicKey, ik.secretKey);

  // 4. One-Time Pre-Keys (Batch of 5)
  const opks = Array.from({ length: 5 }).map(() => nacl.box.keyPair());

  return {
    identity_key: encodeBase64(ik.publicKey),
    signed_pre_key: encodeBase64(spk.publicKey),
    pre_key_sig: encodeBase64(sig),
    one_time_pre_keys: opks.map(k => encodeBase64(k.publicKey)),

    // Store secrets (In real app, put in IndexedDB)
    private_identity_key: encodeBase64(ik.secretKey),
    private_signed_pre_key: encodeBase64(spk.secretKey),
    private_one_time_keys: opks.map(k => encodeBase64(k.secretKey)),
  };
}
