FROM node:20-bullseye

# Installer les dépendances système nécessaires
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

# Installer pipx, spotdl et yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Installer pnpm proprement via script officiel
RUN curl -fsSL https://get.pnpm.io/install.sh | bash -
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PATH="/root/.local/share/pnpm/global/5/node_modules/.bin:$PATH"

# Configurer explicitement le répertoire global de pnpm
RUN pnpm config set global-bin-dir /root/.local/share/pnpm/global-bin

# Initialiser explicitement PNPM (crée automatiquement les répertoires requis)
RUN pnpm setup

# Vérifier l'installation (optionnel mais recommandé)
RUN pnpm --version

# Installer sequelize-cli globalement avec pnpm
RUN pnpm add -g sequelize-cli

WORKDIR /app

# Copier les fichiers nécessaires
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances locales via pnpm
RUN pnpm install --frozen-lockfile

# Copier tout le reste du projet
COPY . .

# Copier .env
COPY .env .env

# Exposer le port de l'application
EXPOSE 3000

# Lancer les migrations et démarrer le serveur
CMD ["bash", "-c", "sleep 5 && sequelize-cli db:migrate --config=config/config.js && sequelize-cli db:seed:all --config=config/config.js && bun src/server.js"]
