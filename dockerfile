# Base Node avec Debian (nécessaire pour Sequelize CLI et Puppeteer)
FROM node:20-bullseye

# Installer les dépendances nécessaires pour Puppeteer, Sequelize CLI et SpotDL
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

# Installer pipx et spotdl/yt-dlp
RUN apt-get install -y python3 python3-pip && pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH=/root/.local/bin:$PATH

# Installer Sequelize CLI globalement
RUN npm install -g sequelize-cli

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances et installer via Bun
COPY package.json bun.lockb* ./
RUN bun install

# Copier le reste de l'application
COPY . .

# Charger les variables d'environnement au build pour les migrations
COPY .env .env

# Exécuter les migrations et seeders avec Sequelize CLI avant le démarrage du serveur
RUN sequelize-cli db:migrate --config=config/config.js \
    && sequelize-cli db:seed:all --config=config/config.js

# Exposer le port utilisé par Bun
EXPOSE 3000

# Lancer le serveur avec Bun
CMD ["bun", "src/server.js"]
