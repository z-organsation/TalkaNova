import socket
import threading
from cryptography.hazmat.primitives.asymmetric import rsa
import json
from cryptography.hazmat.primitives import serialization

class ChatServer:
    def __init__(self, host='localhost', port=12345):
        self.server_address = (host, port)
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.clients = {}
        self.usernames = {}
        self.public_keys = {}
        self.running = False
        
    def start(self):
        self.socket.bind(self.server_address)
        self.socket.listen(5)
        print(f"Chat server started on {self.server_address[0]}:{self.server_address[1]}")
        self.running = True
        while self.running:
            client_socket, client_address = self.socket.accept()
            print(f"New connection from {client_address}")
            raw = client_socket.recv(4096).decode('utf-8')
            try:
                auth_info = json.loads(raw)
            except Exception:
                try:
                    client_socket.close()
                except Exception:
                    pass
                continue

            username, pem_public_key = auth_info.get('username'), auth_info.get('public_key')
            if not username or not pem_public_key:
                try:
                    client_socket.close()
                except Exception:
                    pass
                continue

            public_key = serialization.load_pem_public_key(
                pem_public_key.encode('utf-8')
            )

            self.clients[client_socket] = client_address
            self.usernames[client_socket] = username
            self.public_keys[client_socket] = public_key

            peers = []
            for s, user in self.usernames.items():
                if s == client_socket:
                    continue
                try:
                    pem = self.public_keys[s].public_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PublicFormat.SubjectPublicKeyInfo
                    ).decode('utf-8')
                except Exception:
                    pem = ""
                peers.append({'username': user, 'public_key': pem})

            try:
                client_socket.sendall(json.dumps({'type': 'peer_list', 'peers': peers}).encode('utf-8'))
            except Exception:
                pass

            join_msg = json.dumps({'type': 'peer_joined', 'username': username, 'public_key': pem_public_key}).encode('utf-8')
            self.broadcast(join_msg, exclude=client_socket)

            threading.Thread(target=self.handle_client, args=(client_socket,), daemon=True).start()

    def handle_client(self, client_socket):
        while self.running:
            try:
                raw = client_socket.recv(4096)
                print(raw)
                if not raw:
                    self.remove_client(client_socket)
                    break
                try:
                    message = raw.decode('utf-8')
                    print(message)
                except Exception:
                    self.broadcast(raw, exclude=client_socket)
                    continue

                try:
                    envelope = json.loads(message)
                    print(message)
                except Exception:
                    print(f"Received message: {message}")
                    self.broadcast(message, exclude=client_socket)
                    continue

                mtype = envelope.get('type')
                if mtype == 'quit':
                    self.remove_client(client_socket)
                    break
                elif mtype == 'message':
                    self.broadcast(json.dumps(envelope).encode('utf-8'), exclude=client_socket)
                else:
                    self.broadcast(json.dumps(envelope).encode('utf-8'), exclude=client_socket)
            except ConnectionResetError:
                self.remove_client(client_socket)
                break

    def broadcast(self, message, exclude=None):
        for client in list(self.clients.keys()):
            if exclude is not None and client == exclude:
                continue
            try:
                if isinstance(message, bytes):
                    client.sendall(message)
                else:
                    client.sendall(str(message).encode('utf-8'))
            except Exception:
                pass

    def remove_client(self, client_socket):
        if client_socket in self.clients:
            username = self.usernames.get(client_socket, "")
            try:
                del self.clients[client_socket]
            except KeyError:
                pass
            try:
                del self.usernames[client_socket]
            except KeyError:
                pass
            try:
                del self.public_keys[client_socket]
            except KeyError:
                pass
            if username:
                self.broadcast(f"{username} has left the chat.")
        try:
            client_socket.close()
        except OSError:
            pass

    def derive_key(self, client_socket):
        for client in self.clients:
            if client != client_socket:
                return self.public_keys[client]

if __name__ == "__main__":
    server = ChatServer()
    server.start()