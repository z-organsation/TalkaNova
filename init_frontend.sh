#!/bin/bash
# Script d'initialisation du frontend

cd front-end

# Installer les dépendances
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances npm..."
    npm install
else
    echo "Dépendances déjà installées, vérification..."
    npm install
fi

# Vérifier et installer les dépendances manquantes pour le chiffrement
echo "Installation des dépendances de chiffrement..."
npm install tweetnacl@^1.0.3

# Créer .env.local si nécessaire
if [ ! -f ".env.local" ]; then
    echo "Création du fichier .env.local..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_APP_NAME=TalkaNova
NEXT_PUBLIC_DEBUG=true
EOF
    echo "✅ Fichier .env.local créé"
else
    echo "✅ Fichier .env.local existe déjà"
fi

# Vérifier la configuration Tailwind
echo "Vérification de la configuration Tailwind..."
if [ ! -f "tailwind.config.js" ]; then
    echo "⚠️  Fichier tailwind.config.js manquant"
fi

if [ ! -f "postcss.config.mjs" ]; then
    echo "⚠️  Fichier postcss.config.mjs manquant"
fi

echo "✅ Frontend initialisé!"
echo "Pour lancer: cd front-end && npm run dev"
