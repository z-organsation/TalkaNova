#!/bin/bash
# Script d'initialisation du frontend

cd front-end

# Installer les dépendances
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances npm..."
    npm install
fi

# Créer .env.local si nécessaire
if [ ! -f ".env.local" ]; then
    echo "Création du fichier .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
EOF
    echo "✅ Fichier .env.local créé"
fi

echo "✅ Frontend initialisé!"
echo "Pour lancer: cd front-end && npm run dev"
