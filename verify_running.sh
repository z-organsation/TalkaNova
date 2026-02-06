#!/bin/bash
# Script de vérification des services

echo "🔍 Vérification des services TalkaNova..."

# Vérifier le backend
echo "📡 Test du backend (http://localhost:8000)..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend: OK (Status: $BACKEND_STATUS)"
    BACKEND_RESPONSE=$(curl -s http://localhost:8000/)
    echo "   Réponse: $BACKEND_RESPONSE"
else
    echo "❌ Backend: ERREUR (Status: $BACKEND_STATUS)"
fi

# Vérifier l'API docs
echo "📚 Test de la documentation API (http://localhost:8000/docs)..."
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs)
if [ "$DOCS_STATUS" = "200" ]; then
    echo "✅ Documentation API: OK (Status: $DOCS_STATUS)"
else
    echo "❌ Documentation API: ERREUR (Status: $DOCS_STATUS)"
fi

# Vérifier le frontend
echo "🌐 Test du frontend (http://localhost:3000)..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend: OK (Status: $FRONTEND_STATUS)"
else
    echo "❌ Frontend: ERREUR (Status: $FRONTEND_STATUS)"
fi

# Vérifier les processus
echo "sPid des processus:"
BACKEND_PID=$(lsof -ti :8000)
FRONTEND_PID=$(lsof -ti :3000)

if [ ! -z "$BACKEND_PID" ]; then
    echo "✅ Backend PID: $BACKEND_PID"
else
    echo "❌ Backend non trouvé sur le port 8000"
fi

if [ ! -z "$FRONTEND_PID" ]; then
    echo "✅ Frontend PID: $FRONTEND_PID"
else
    echo "❌ Frontend non trouvé sur le port 3000"
fi

echo ""
echo "📋 Services actifs:"
echo "- Backend: http://localhost:8000"
echo "- Frontend: http://localhost:3000"
echo "- Documentation API: http://localhost:8000/docs"
