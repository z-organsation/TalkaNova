#!/usr/bin/env python3
"""
Fernet Decryption for Chat App
Save this as decrypt.py
"""

import base64
import hashlib
import hmac
import sys
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class ChatDecryption:
    def __init__(self, secret: str):
        """
        Initialize decryption system with a secret.
        
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
    
    def decrypt_message(self, encrypted_message: str, key: Optional[bytes] = None,
                       is_general: bool = False) -> str:
        """
        Decrypt a message with the specified key.
        
        Args:
            encrypted_message: Base64 encoded encrypted message
            key: Fernet key (if None, uses general chat key)
            is_general: If True, uses general chat key
            
        Returns:
            Decrypted plaintext message
            
        Raises:
            cryptography.fernet.InvalidToken: If decryption fails
        """
        if is_general or key is None:
            fernet = Fernet(self.general_key)
        else:
            fernet = Fernet(key)
        
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_message.encode())
        decrypted = fernet.decrypt(encrypted_bytes)
        return decrypted.decode()

def main():
    """Command-line interface for decryption."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Decrypt chat messages')
    parser.add_argument('--secret', required=True, help='Application secret key')
    parser.add_argument('--encrypted', required=True, help='Encrypted message in format TYPE:data')
    
    args = parser.parse_args()
    
    try:
        decryption = ChatDecryption(args.secret)
        
        # Parse the encrypted message format
        parts = args.encrypted.split(':')
        
        if len(parts) < 2:
            print("Error: Invalid encrypted message format")
            sys.exit(1)
        
        message_type = parts[0]
        
        if message_type == "GENERAL_CHAT":
            # Format: GENERAL_CHAT:encrypted_data
            encrypted_data = parts[1]
            decrypted = decryption.decrypt_message(encrypted_data, is_general=True)
            print(f"Decrypted (General Chat): {decrypted}")
        
        elif message_type == "PRIVATE_CHAT":
            # Format: PRIVATE_CHAT:user1:user2:encrypted_data
            if len(parts) != 4:
                print("Error: Invalid private chat format")
                sys.exit(1)
            
            user1, user2, encrypted_data = parts[1], parts[2], parts[3]
            private_key = decryption.generate_private_key(user1, user2)
            decrypted = decryption.decrypt_message(encrypted_data, key=private_key)
            print(f"Decrypted (Private Chat between {user1} and {user2}): {decrypted}")
        
        else:
            print(f"Error: Unknown message type: {message_type}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
