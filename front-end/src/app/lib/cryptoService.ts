/**
 * CryptoService - E2EE encryption/decryption service for TalkaNova
 * Wraps crypto.ts functions with session key management
 */

import nacl from 'tweetnacl';
import {
    generateKeyPair,
    encrypt,
    decrypt,
    publicKeyToBase64,
    secretKeyToBase64,
    base64ToSecretKey,
    roomOpaqueEncode,
    roomOpaqueDecode,
    KeyPair,
} from './crypto';

const KEY_STORAGE_KEY = 'talkanova_keypair';

interface StoredKeys {
    publicKey: string;
    secretKey: string;
}

class CryptoService {
    private keyPair: KeyPair | null = null;

    constructor() {
        this.loadOrGenerateKeys();
    }

    /**
     * Load existing keys from localStorage or generate new ones
     */
    private loadOrGenerateKeys(): void {
        if (typeof window === 'undefined') return;

        const stored = localStorage.getItem(KEY_STORAGE_KEY);
        if (stored) {
            try {
                const parsed: StoredKeys = JSON.parse(stored);
                this.keyPair = {
                    publicKey: Uint8Array.from(atob(parsed.publicKey), c => c.charCodeAt(0)),
                    secretKey: base64ToSecretKey(parsed.secretKey),
                };
                console.log('[CryptoService] Loaded existing keys');
                return;
            } catch (e) {
                console.warn('[CryptoService] Failed to load stored keys, regenerating');
            }
        }

        // Generate new keypair
        this.keyPair = generateKeyPair();
        this.saveKeys();
        console.log('[CryptoService] Generated new keypair');
    }

    private saveKeys(): void {
        if (!this.keyPair || typeof window === 'undefined') return;
        const toStore: StoredKeys = {
            publicKey: publicKeyToBase64(this.keyPair.publicKey),
            secretKey: secretKeyToBase64(this.keyPair.secretKey),
        };
        localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(toStore));
    }

    /**
     * Get public key as base64 string (for sharing)
     */
    getPublicKey(): string {
        if (!this.keyPair) {
            this.loadOrGenerateKeys();
        }
        return this.keyPair ? publicKeyToBase64(this.keyPair.publicKey) : '';
    }

    /**
     * Encrypt message for recipient
     */
    encryptForRecipient(plaintext: string, recipientPublicKeyB64: string): string {
        if (!this.keyPair) throw new Error('No keypair available');
        return encrypt(plaintext, recipientPublicKeyB64, this.keyPair.secretKey);
    }

    /**
     * Decrypt message from sender
     */
    decryptFromSender(ciphertextB64: string, senderPublicKeyB64: string): string {
        if (!this.keyPair) throw new Error('No keypair available');
        return decrypt(ciphertextB64, senderPublicKeyB64, this.keyPair.secretKey);
    }

    /**
     * Encode for room chat (opaque base64, not true E2EE)
     */
    encodeRoomMessage(plaintext: string): string {
        return roomOpaqueEncode(plaintext);
    }

    /**
     * Decode room chat message
     */
    decodeRoomMessage(encoded: string): string {
        return roomOpaqueDecode(encoded);
    }

    /**
     * Generate random encryption key for file transfer
     */
    generateFileKey(): { key: Uint8Array; keyB64: string } {
        const key = nacl.randomBytes(32);
        return {
            key,
            keyB64: publicKeyToBase64(key),
        };
    }

    /**
     * Reset keys (for logout/identity reset)
     */
    resetKeys(): void {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(KEY_STORAGE_KEY);
        }
        this.keyPair = null;
        this.loadOrGenerateKeys();
    }
}

// Singleton instance
export const cryptoService = new CryptoService();
export default CryptoService;
