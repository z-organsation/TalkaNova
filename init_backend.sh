#!/bin/bash
# Script d'initialisation du backend

cd backend

# Créer venv si nécessaire
if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer venv
source venv/bin/activate

# Installer les dépendances
echo "Installation des dépendances..."
pip install -r requirements.txt

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
EOF
    echo "✅ Fichier .env créé avec SECRET_KEY généré"
fi

echo "✅ Backend initialisé!"
echo "Pour lancer: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
