FROM node:20-bullseye

# 🧱 Dépendances système
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# ⚡ Installer Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# 🎵 Installer spotdl + yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# 📁 Créer dossier de travail
WORKDIR /app

# 📦 Installer les dépendances
COPY package.json ./
RUN bun install

# 🔐 Copier tous les fichiers
COPY . .

# ⚙ Autoriser l’exécution du script d’entrée
RUN chmod +x /app/entrypoint.sh

# 📤 Exposer le port backend
EXPOSE 3000

# 🚀 Commande de démarrage
CMD ["/app/entrypoint.sh"]
