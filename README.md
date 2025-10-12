🚀 TalkaNova – Enhanced Edition

We upgraded TalkaNova, the modern messaging app originally built with Next.js, TypeScript, TailwindCSS, and Supabase, by introducing new layers of security and performance through a custom Python WebSocket server and end-to-end encryption.

✨ New Features & Improvements

🧠 Custom WebSocket Server (Python) — We replaced the default Supabase Realtime dependency for private chats with our own WebSocket server, offering greater control, flexibility, and scalability.

🔒 Message Encryption & Decryption — Every message sent between users is now encrypted before transmission and decrypted upon reception, ensuring confidentiality and protection against data leaks.

⚡ Improved Realtime Performance — Communication between clients is faster and more stable thanks to the dedicated Python-based socket handling.

🧩 Seamless Integration — The WebSocket server integrates smoothly with the existing Next.js frontend and Supabase authentication system.

🛠️ Updated Stack

Frontend: Next.js, TypeScript, TailwindCSS

Backend: Python (WebSockets), Supabase (Auth & Database)

Security: AES-based message encryption

Deployment: Vercel (Frontend), custom server hosting for WebSockets
