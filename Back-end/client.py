import sys
import threading
import socket
import json
import base64

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives import serialization

class ChatClient:
    def __init__(self, host='localhost', port=12345,):
        self.server_address = (host, port)
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.username = ""
        self.private_key = None
        self.public_key = None
        self.peers = {}
        self.running = True

    def generate_keys(self):
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        self.public_key = self.private_key.public_key()
        return self.private_key, self.public_key

    def connect(self):
        try:
            while not self.username:
                self.username = input("Enter your username: ").strip()

            pem_public_key = self.public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            auth_info = {
                'username': self.username,
                'public_key': pem_public_key,
            }
            self.socket.connect(self.server_address)
            self.socket.sendall(json.dumps(auth_info).encode('utf-8'))
            print(f"Connected to chat server at {self.server_address[0]}:{self.server_address[1]} as {self.username}")
            print("Type your messages below. Type '/quit' to exit.")
        except ConnectionRefusedError:
            print("Failed to connect to the server.")
            self.running = False
    
    def send_message(self, message):
        encrypted_map = {}
        for user, pub in self.peers.items():
            if user == self.username:
                continue
            try:
                ct = pub.encrypt(
                    message.encode('utf-8'),
                    padding.OAEP(
                        mgf=padding.MGF1(algorithm=hashes.SHA256()),
                        algorithm=hashes.SHA256(),
                        label=None
                    )
                )
                encrypted_map[user] = base64.b64encode(ct).decode('utf-8')
            except Exception:
                pass

        envelope = {'type': 'message', 'sender': self.username, 'encrypted': encrypted_map}
        try:
            self.socket.sendall(json.dumps(envelope).encode('utf-8'))
        except BrokenPipeError:
            print("Failed to send message. Connection to server lost.")
            self.running = False

    def receive_messages(self):
        while self.running:
            try:
                raw = self.socket.recv(4096)
                if not raw:
                    print("Disconnected from server.")
                    self.running = False
                    break

                try:
                    text = raw.decode('utf-8')
                except Exception:
                    continue

                try:
                    envelope = json.loads(text)
                except Exception:
                    print(text)
                    continue

                mtype = envelope.get('type')
                if mtype == 'peer_list':
                    peers = envelope.get('peers', [])
                    for p in peers:
                        uname = p.get('username')
                        pem = p.get('public_key')
                        if uname and pem:
                            try:
                                pub = serialization.load_pem_public_key(pem.encode('utf-8'))
                                self.peers[uname] = pub
                            except Exception:
                                pass
                elif mtype == 'peer_joined':
                    uname = envelope.get('username')
                    pem = envelope.get('public_key')
                    if uname and pem:
                        try:
                            pub = serialization.load_pem_public_key(pem.encode('utf-8'))
                            self.peers[uname] = pub
                            print(f"{uname} has joined the chat.")
                        except Exception:
                            pass
                elif mtype == 'peer_left':
                    uname = envelope.get('username')
                    if uname and uname in self.peers:
                        del self.peers[uname]
                        print(f"{uname} has left the chat.")
                elif mtype == 'message':
                    sender = envelope.get('sender')
                    encrypted = envelope.get('encrypted', {})
                    my_ct_b64 = encrypted.get(self.username)
                    if my_ct_b64:
                        try:
                            ct = base64.b64decode(my_ct_b64)
                            pt = self.private_key.decrypt(
                                ct,
                                padding.OAEP(
                                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                                    algorithm=hashes.SHA256(),
                                    label=None
                                )
                            )
                            print(f"{sender}: {pt.decode('utf-8')}")
                        except Exception:
                            pass
                elif mtype == 'quit':
                    uname = envelope.get('username')
                    if uname and uname in self.peers:
                        del self.peers[uname]
                        print(f"{uname} has disconnected.")
                else:
                    print(envelope)
            except ConnectionResetError:
                print("Connection to server lost.")
                exit(1)

    def encrypt_message(self, message, recipient_public_key):
        ciphertext = recipient_public_key.encrypt(
            message.encode('utf-8'),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return ciphertext    

    def decrypt_message(self, ciphertext):
        plaintext = self.private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return plaintext.decode('utf-8')        

if __name__ == "__main__":
    client = ChatClient()
    client.generate_keys()
    client.connect()

    if client.running:
        threading.Thread(target=client.receive_messages, daemon=True).start()

        try:
            while client.running:
                message = input('>> ')
                if message.lower() == '/quit':
                    try:
                        client.socket.sendall(json.dumps({'type': 'quit', 'username': client.username}).encode('utf-8'))
                    except Exception:
                        pass
                    client.running = False
                    try:
                        client.socket.close()
                    except Exception:
                        pass
                else:
                    client.send_message(message)
        except KeyboardInterrupt:
            try:
                client.socket.sendall(json.dumps({'type': 'quit', 'username': client.username}).encode('utf-8'))
            except Exception:
                pass
            try:
                client.socket.close()
            except Exception:
                pass