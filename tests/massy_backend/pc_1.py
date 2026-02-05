from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import time
import requests
import subprocess
import os
import socket
import threading
from datetime import datetime, timedelta

app = Flask(__name__)
# Configuration CORS plus permissive pour le développement
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000"])

# ⚠️ CONFIGURATION SIMPLIFIÉE - PLUS BESOIN DE PEER_IP FIXE ⚠️
MY_NAME = "PC-A"  # Changez sur chaque PC: "PC-A" ou "PC-B"

# Variables globales
messages = []
peer_ips = []  # Liste des IPs des pairs découverts
connection_status = {}
last_discovery = None
DISCOVERY_INTERVAL = 30  # Secondes entre les découvertes

def get_tailscale_ip():
    """Récupère l'IP Tailscale actuelle"""
    try:
        result = subprocess.run(['tailscale', 'ip', '--4'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            ip = result.stdout.strip()
            if ip and ip.startswith('100.'):
                return ip
        return None
    except Exception as e:
        print(f"Erreur récupération IP Tailscale: {e}")
        return None

def discover_peers():
    """Découvre automatiquement les autres PCs sur le réseau Tailscale"""
    global peer_ips, last_discovery
    
    try:
        # Récupérer la liste des pairs depuis Tailscale
        result = subprocess.run(['tailscale', 'status', '--json'], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            data = json.loads(result.stdout)
            discovered_ips = []
            
            # Parcourir tous les pairs
            for peer_key, peer_info in data.get('Peer', {}).items():
                if peer_info.get('Online'):
                    # Récupérer les IPs du pair
                    for ip_info in peer_info.get('TailscaleIPs', []):
                        if ip_info.startswith('100.'):
                            discovered_ips.append(ip_info)
                            print(f"🔍 Pair découvert: {ip_info}")
            
            # Filtrer pour éviter notre propre IP
            my_ip = get_tailscale_ip()
            peer_ips = [ip for ip in discovered_ips if ip != my_ip]
            
            last_discovery = datetime.now()
            print(f"✅ Découverte terminée. {len(peer_ips)} pair(s) trouvé(s): {peer_ips}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la découverte: {e}")

def background_discovery():
    """Thread de découverte en arrière-plan"""
    while True:
        discover_peers()
        time.sleep(DISCOVERY_INTERVAL)

def try_all_peers(endpoint, method='GET', json_data=None, timeout=3):
    """Essaie de communiquer avec tous les pairs connus"""
    responses = []
    
    for peer_ip in peer_ips:
        try:
            url = f"http://{peer_ip}:5000{endpoint}"
            
            if method == 'GET':
                response = requests.get(url, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=json_data, timeout=timeout)
            else:
                continue
                
            if response.status_code == 200:
                responses.append({
                    'ip': peer_ip,
                    'success': True,
                    'data': response.json()
                })
                connection_status[peer_ip] = True
            else:
                connection_status[peer_ip] = False
                
        except Exception as e:
            connection_status[peer_ip] = False
            responses.append({
                'ip': peer_ip,
                'success': False,
                'error': str(e)
            })
    
    return responses

@app.route('/api/messages', methods=['GET'])
def get_messages():
    """Récupère tous les messages"""
    return jsonify({
        'messages': messages,
        'count': len(messages),
        'source': MY_NAME
    })

@app.route('/api/messages', methods=['POST'])
def send_message():
    """Envoie un message à tous les pairs"""
    data = request.json
    
    if not data or 'text' not in data:
        return jsonify({'error': 'Message text required'}), 400
    
    # Créer le message
    message = {
        'id': f"{MY_NAME}-{int(time.time()*1000)}-{os.urandom(4).hex()}",
        'text': data['text'],
        'sender': MY_NAME,
        'timestamp': time.time(),
        'source_ip': get_tailscale_ip()
    }
    
    # Ajouter localement
    messages.append(message)
    print(f"💬 [{MY_NAME}] Message local: {message['text']}")
    
    # Essayer d'envoyer à tous les pairs
    delivered_to = []
    failed_to = []
    
    responses = try_all_peers('/api/receive-message', method='POST', json_data=message)
    
    for resp in responses:
        if resp['success']:
            delivered_to.append(resp['ip'])
        else:
            failed_to.append(resp['ip'])
    
    return jsonify({
        'status': 'success',
        'message': message,
        'delivered_to': delivered_to,
        'failed_to': failed_to,
        'total_peers': len(peer_ips)
    })

@app.route('/api/receive-message', methods=['POST'])
def receive_message():
    """Reçoit un message d'un pair"""
    message = request.json
    
    # Vérifier si c'est un doublon
    existing = any(m['id'] == message['id'] for m in messages)
    
    if not existing:
        messages.append(message)
        print(f"📨 [{MY_NAME}] Message reçu de {message.get('sender', 'unknown')}: {message['text']}")
    
    return jsonify({'status': 'received', 'duplicate': existing})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de santé"""
    return jsonify({
        'status': 'healthy',
        'name': MY_NAME,
        'my_ip': get_tailscale_ip(),
        'my_name': MY_NAME,
        'peer_ips': peer_ips,
        'connection_status': connection_status,
        'message_count': len(messages),
        'last_discovery': str(last_discovery) if last_discovery else None
    })

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Teste la connexion avec les pairs"""
    responses = try_all_peers('/api/health')
    
    connected_peers = []
    for resp in responses:
        if resp['success']:
            connected_peers.append({
                'ip': resp['ip'],
                'info': resp['data']
            })
    
    return jsonify({
        'status': 'connected' if connected_peers else 'disconnected',
        'connected_peers': connected_peers,
        'total_peers_found': len(peer_ips),
        'my_ip': get_tailscale_ip()
    })

@app.route('/api/discover', methods=['GET'])
def force_discover():
    """Force une nouvelle découverte"""
    discover_peers()
    return jsonify({
        'status': 'discovery_complete',
        'peers_found': peer_ips,
        'count': len(peer_ips)
    })

def start_server():
    """Démarre le serveur"""
    
    # Démarrer la découverte en arrière-plan
    discovery_thread = threading.Thread(target=background_discovery, daemon=True)
    discovery_thread.start()
    
    # Initial discovery
    discover_peers()
    
    print("=" * 60)
    print("🌐 SERVEUR P2P INTELLIGENT AVEC DÉCOUVERTE AUTOMATIQUE")
    print("=" * 60)
    print(f"👤 Mon nom: {MY_NAME}")
    print(f"📍 Mon IP Tailscale: {get_tailscale_ip() or 'Non connecté'}")
    print(f"🔍 Découverte automatique activée")
    print(f"🔄 Intervalle: {DISCOVERY_INTERVAL} secondes")
    print(f"🌍 Port: 5000")
    print("=" * 60)
    print("💡 Les IPs des pairs sont détectées automatiquement!")
    print("💡 Plus besoin de configurer PEER_IP manuellement")
    print("🚀 Serveur démarré! Ouvrez http://localhost:3000 pour le frontend")
    print("=" * 60)
    
    # Démarrer Flask
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)

if __name__ == '__main__':
    start_server()
