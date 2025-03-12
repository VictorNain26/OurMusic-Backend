FROM node:20-bullseye

# Dépendances système
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pnpm
RUN curl -fsSL https://get.pnpm.io/v6.16.js | node - add --global pnpm
ENV PATH="/root/.pnpm-global/bin:$PATH"

# spotdl + yt-dlp via pipx
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Dossier de travail
WORKDIR /app

# Copie fichiers de base
COPY package.json pnpm-lock.yaml ./
RUN rm -rf node_modules

# Installation des dépendances
RUN pnpm install --frozen-lockfile

# Copie du code source
COPY . .

# Ajout du .env si présent (ou injecté à l'exécution via volume/env var)
COPY .env .env

# Exposition du port
EXPOSE 3000

# Lancement : attente DB → migration via npx → lancement backend
CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  bunx sequelize-cli db:migrate && \
  bun src/index.js"]
