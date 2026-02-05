#!/bin/bash
# Script pour lancer le projet complet

echo "🚀 Démarrage de TalkaNova..."

# Lancer le backend en arrière-plan
echo "📡 Démarrage du backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "❌ Veuillez d'abord exécuter ./init_backend.sh"
    exit 1
fi

source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
sleep 3

# Lancer le frontend
echo "🌐 Démarrage du frontend..."
cd front-end
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Serveurs lancés!"
echo "📡 Backend: http://localhost:8000 (PID: $BACKEND_PID)"
echo "🌐 Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Attendre Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
