# 🚀 TalkaNova

**TalkaNova** est une application de messagerie moderne construite avec **Next.js**, **TypeScript**, **TailwindCSS** et **Supabase**.  
Elle permet de discuter en temps réel via un chat général, des conversations privées entre amis et des salons éphémères protégés par un code.

🌐 Hébergée sur **Vercel**  
⚡ Gestion des comptes et messages avec **Supabase (Realtime + Auth)**  

---

## ✨ Fonctionnalités

- 🔐 **Authentification** via Supabase (création de compte, connexion, déconnexion)  
- 💬 **Chat général** ouvert à tous les utilisateurs connectés  
- 🔑 **Salons privés temporaires** avec un code unique à partager entre amis  
- ⚡ **Messagerie en temps réel** grâce à Supabase Realtime & WebSockets  
- 🎨 **Interface responsive & moderne** avec TailwindCSS  
- ☁️ **Déploiement sur Vercel**  

---

## 🛠️ Stack technique

- [Next.js](https://nextjs.org/) — Framework React moderne  
- [TypeScript](https://www.typescriptlang.org/) — Typage statique et robustesse du code  
- [TailwindCSS](https://tailwindcss.com/) — UI rapide et responsive  
- [Supabase](https://supabase.com/) — Authentification + Realtime Database + WebSocket  
- [Vercel](https://vercel.com/) — Déploiement cloud  

---

## ⚙️ Installation & lancement local

### Prérequis
- [Node.js](https://nodejs.org/en/)  
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)  
- Un compte [Supabase](https://supabase.com/)  

### Étapes

```bash
# Cloner le projet
git clone https://github.com/Imadzakxy/TalkaNova.git

# Aller dans le dossier
cd TalkaNova

# Installer les dépendances
npm install
# ou
yarn install

# Lancer en mode développement
npm run dev
# ou
yarn dev
