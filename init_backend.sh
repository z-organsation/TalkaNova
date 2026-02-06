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

# Mettre à jour pip
echo "Mise à jour de pip..."
pip install --upgrade pip

# Installer les dépendances
echo "Installation des dépendances..."
pip install -r requirements.txt

# Vérifier et installer les dépendances manquantes
echo "Vérification des dépendances supplémentaires..."
pip install aiosmtplib>=2.0.0

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

# Email Configuration (Gmail SMTP - Enable 2FA and use App Password)
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
    echo "✅ Fichier .env créé avec SECRET_KEY généré"
else
    echo "✅ Fichier .env existe déjà"
fi

# Vérifier la base de données
echo "Vérification de la base de données..."
python3 check_db.py

echo "✅ Backend initialisé!"
echo "Pour lancer: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
