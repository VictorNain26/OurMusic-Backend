FROM node:20-bullseye

# Dépendances système
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# spotdl + yt-dlp via pipx
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Création dossier de travail
WORKDIR /app

# Copie des fichiers nécessaires à l’installation des dépendances
COPY package.json bun.lockb ./

# Installation des dépendances Bun
RUN bun install --frozen-lockfile

# Copie du code source
COPY . .

# Ajout du .env si présent (ou injecté à l'exécution via volume/env var)
COPY .env .env

# Exposition du port applicatif
EXPOSE 3000

# Commande de démarrage avec attente de PostgreSQL + migration + lancement backend
CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  bun run db:migrate && \
  bun src/index.js"]
