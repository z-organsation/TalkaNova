#!/usr/bin/env python3
"""
Fernet Encryption for Chat App
Save this as encrypt.py
"""

import base64
import hashlib
import hmac
import sys
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class ChatEncryption:
    def __init__(self, secret: str):
        """
        Initialize encryption system with a secret.
        
        Args:
            secret: Application secret used for key derivation
        """
        if not secret or len(secret) < 16:
            raise ValueError("Secret must be at least 16 characters long")
        self.secret = secret.encode()
        
        # Generate general chat room key
        self.general_key = self._generate_key_from_secret("general_chat_room")
    
    def _generate_key_from_secret(self, salt_data: str) -> bytes:
        """Generate a Fernet key from secret and salt using PBKDF2."""
        salt = hmac.new(
            self.secret,
            salt_data.encode(),
            hashlib.sha256
        ).digest()[:16]
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.secret))
        return key
    
    def generate_private_key(self, user1: str, user2: str) -> bytes:
        """
        Generate deterministic private key for two users.
        
        Args:
            user1: First user ID
            user2: Second user ID
            
        Returns:
            Fernet key for private conversation
        """
        # Sort user IDs to ensure same key regardless of order
        sorted_users = tuple(sorted([user1, user2]))
        salt_data = f"private_chat:{sorted_users[0]}:{sorted_users[1]}"
        
        return self._generate_key_from_secret(salt_data)
    
    def encrypt_message(self, message: str, key: Optional[bytes] = None, 
                       is_general: bool = False) -> str:
        """
        Encrypt a message with the specified key.
        
        Args:
            message: Plaintext message to encrypt
            key: Fernet key (if None, uses general chat key)
            is_general: If True, uses general chat key
            
        Returns:
            Base64 encoded encrypted message
        """
        if is_general or key is None:
            fernet = Fernet(self.general_key)
        else:
            fernet = Fernet(key)
        
        encrypted = fernet.encrypt(message.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

def main():
    """Command-line interface for encryption."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Encrypt chat messages')
    parser.add_argument('--secret', required=True, help='Application secret key')
    parser.add_argument('--message', required=True, help='Message to encrypt')
    parser.add_argument('--general', action='store_true', help='Use general chat room key')
    parser.add_argument('--user1', help='First user ID for private chat')
    parser.add_argument('--user2', help='Second user ID for private chat')
    
    args = parser.parse_args()
    
    try:
        encryption = ChatEncryption(args.secret)
        
        if args.general:
            # Use general chat room
            encrypted = encryption.encrypt_message(args.message, is_general=True)
            print(f"GENERAL_CHAT:{encrypted}")
        
        elif args.user1 and args.user2:
            # Use private chat
            private_key = encryption.generate_private_key(args.user1, args.user2)
            encrypted = encryption.encrypt_message(args.message, key=private_key)
            print(f"PRIVATE_CHAT:{args.user1}:{args.user2}:{encrypted}")
        
        else:
            print("Error: Either --general flag or both --user1 and --user2 required")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
