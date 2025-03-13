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

# 📁 Dossier de travail
WORKDIR /app

# 📦 Copier package.json + bun.lock et installer
COPY package.json bun.lock ./
RUN bun install --no-cache

# 🔐 Copier tous les fichiers
COPY . .

# ⚙ Donner les droits d'exécution à entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# 📤 Exposer le port
EXPOSE 3000

# 🟢 Lancer l'application via le script shell
CMD ["/app/entrypoint.sh"]
