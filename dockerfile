FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    bash \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    firefox-esr \
    build-essential \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libgtk-3-0

# Installer Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installer PNPM
RUN npm install -g pnpm

# Installer pipx, spotdl et yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Installer sequelize-cli globalement (correct avec pnpm)
RUN pnpm add -g sequelize-cli

WORKDIR /app

# Copier les fichiers package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances (sequelize requis localement)
RUN pnpm install --frozen-lockfile

# Copier tout le reste du projet
COPY . .

# Exposer le port
EXPOSE 3000

# Lancer les migrations puis l'application au démarrage
CMD ["bash", "-c", "sleep 5 && sequelize-cli db:migrate --config=config/config.js && sequelize-cli db:seed:all --config=config/config.js && bun src/server.js"]
