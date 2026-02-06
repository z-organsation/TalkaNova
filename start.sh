#!/bin/bash
# Script pour lancer le projet complet

echo "🚀 Démarrage de TalkaNova..."

# Variables pour les PID
BACKEND_PID=0
FRONTEND_PID=0

# Fonction de nettoyage
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    if [ $BACKEND_PID -ne 0 ]; then
        echo "Arrêt du backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ $FRONTEND_PID -ne 0 ]; then
        echo "Arrêt du frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Serveurs arrêtés"
    exit 0
}

# Capturer les signaux d'interruption
trap cleanup INT TERM

# Vérifier les prérequis
echo "🔍 Vérification des prérequis..."

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé"
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

echo "✅ Prérequis satisfaits"

# Initialiser le backend si nécessaire
echo "🔧 Initialisation du backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installation des dépendances backend..."
pip install --upgrade pip >/dev/null 2>&1
pip install -r requirements.txt >/dev/null 2>&1

# Installer les dépendances manquantes
pip install aiosmtplib>=2.0.0 >/dev/null 2>&1

# Créer .env si nécessaire
if [ ! -f ".env" ]; then
    echo "Création du fichier .env..."
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    cat > .env << EOF
# Database
DATABASE_URL=sqlite:///./talkanova.db

# Security
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=brooozouu@gmail.com
SMTP_PASSWORD=obrjzuhsqnuuoraq
SMTP_FROM=brooozouu@gmail.com
FRONTEND_BASE_URL=http://localhost:3000
PASSWORD_RESET_EXPIRE_MINUTES=30

# Debug
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
API_PREFIX=/api/v1
APP_NAME=TalkaNova
EOF
fi

# Vérifier la base de données
echo "Vérification de la base de données..."
python3 check_db.py
cd ..

# Initialiser le frontend si nécessaire
echo "🔧 Initialisation du frontend..."
cd front-end
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances npm..."
    npm install >/dev/null 2>&1
else
    npm install >/dev/null 2>&1
fi

# Installer les dépendances de chiffrement
npm install tweetnacl@^1.0.3 >/dev/null 2>&1

# Créer .env.local si nécessaire
if [ ! -f ".env.local" ]; then
    echo "Création du fichier .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=TalkaNova
NEXT_PUBLIC_DEBUG=true
EOF
fi
cd ..

# Lancer le backend en arrière-plan
echo "📡 Démarrage du backend..."
cd backend
source venv/bin/activate

# Vérifier que le port 8000 est libre
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 8000 occupé, tentative d'arrêt des processus existants..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
echo "⏳ Attente du démarrage du backend..."
sleep 5

# Vérifier que le backend répond
if curl -s http://localhost:8000/ >/dev/null 2>&1; then
    echo "✅ Backend démarré avec succès"
else
    echo "❌ Erreur lors du démarrage du backend"
    cleanup
fi

# Lancer le frontend
echo "🌐 Démarrage du frontend..."
cd front-end

# Vérifier que le port 3000 est libre
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 occupé, tentative d'arrêt des processus existants..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

npm run dev &
FRONTEND_PID=$!
cd ..

# Attendre que le frontend démarre
echo "⏳ Attente du démarrage du frontend..."
sleep 8

echo ""
echo "🎉 TalkaNova est prêt!"
echo "📡 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Boucle d'attente
while true; do
    # Vérifier que les processus sont toujours actifs
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "❌ Backend arrêté inopinément"
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "❌ Frontend arrêté inopinément"
        break
    fi
    
    sleep 5
done

# Nettoyage final
cleanup
