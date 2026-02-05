from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import time
import requests
import subprocess
import os

app = Flask(__name__)
CORS(app)

# ⚠️ CONFIGURATION - À MODIFIER SUR CHAQUE PC ⚠️

# Sur PC-A:
MY_NAME = "PC-B"  # Donne un nom unique à ton PC
# Sur PC-B:
# MY_NAME = "PC-B"

# Récupère automatiquement l'IP Tailscale
def get_tailscale_ip():
    try:
        result = subprocess.run(['tailscale', 'ip'], capture_output=True, text=True)
        ips = result.stdout.strip().split('\n')
        # Prend la première IPv4
        for ip in ips:
            if ip.startswith('100.'):
                return ip
        return "IP non trouvée"
    except:
        return "Erreur IP"

MY_IP = get_tailscale_ip()

# ⚠️ METS L'IP TAILSCALE DE L'AUTRE PC ICI ⚠️
# Sur PC-A: met l'IP de PC-B
# Sur PC-B: met l'IP de PC-A
PEER_IP = "100.91.250.72"  # REMPLACE PAR L'IP TAILSCALE DE L'AUTRE PC

messages = []
is_connected = False

@app.route('/api/messages', methods=['GET'])
def get_messages():
    return jsonify(messages)

@app.route('/api/messages', methods=['POST'])
def send_message():
    global is_connected
    
    data = request.json
    message = {
        'id': f"{MY_NAME}-{int(time.time()*1000)}",
        'text': data['text'],
        'sender': MY_NAME,
        'timestamp': time.time()
    }
    
    # Ajouter localement
    messages.append(message)
    print(f"💬 Message local: {message['text']}")
    
    # Essayer d'envoyer au pair
    success = False
    try:
        response = requests.post(
            f"http://{PEER_IP}:5000/api/receive-message",
            json=message,
            timeout=5
        )
        if response.status_code == 200:
            success = True
            is_connected = True
            print(f"✅ Message envoyé à distance à {PEER_IP}")
    except Exception as e:
        is_connected = False
        print(f"❌ Impossible d'envoyer à distance: {e}")
    
    return jsonify({
        'status': 'success' if success else 'offline',
        'message': message,
        'delivered': success
    })

@app.route('/api/receive-message', methods=['POST'])
def receive_message():
    global is_connected
    
    message = request.json
    is_connected = True
    
    # Éviter les doublons
    if not any(m['id'] == message['id'] for m in messages):
        messages.append(message)
        print(f"📨 Message reçu de {message['sender']} à distance: {message['text']}")
    
    return jsonify({'status': 'received'})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'name': MY_NAME,
        'my_ip': MY_IP,
        'peer_ip': PEER_IP,
        'connected': is_connected,
        'message_count': len(messages)
    })

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    global is_connected
    try:
        response = requests.get(f"http://{PEER_IP}:5000/api/health", timeout=5)
        if response.status_code == 200:
            is_connected = True
            return jsonify({
                'status': 'connected', 
                'peer_info': response.json()
            })
    except Exception as e:
        is_connected = False
        return jsonify({'status': 'disconnected', 'error': str(e)})
    
    is_connected = False
    return jsonify({'status': 'error'})

def start_server():
    print("🌐 SERVEUR P2P POUR COMMUNICATION À DISTANCE")
    print("=" * 50)
    print(f"👤 Mon nom: {MY_NAME}")
    print(f"📍 Mon IP Tailscale: {MY_IP}")
    print(f"🔗 IP du pair: {PEER_IP}")
    print(f"🌍 Port: 5000")
    print("=" * 50)
    print("💡 Conseil: Vérifie que les deux PCs sont connectés à Tailscale")
    print("🚀 Serveur démarré! Ouvrez http://localhost:3000")
    
    app.run(host='0.0.0.0', port=5000, debug=False)

if __name__ == '__main__':
    start_server()
