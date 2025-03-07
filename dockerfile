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

# Installer PNPM directement via le script officiel
RUN curl -fsSL https://get.pnpm.io/install.sh | bash -
ENV PATH="/root/.local/share/pnpm:$PATH"

# Installer pipx, spotdl et yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Installer sequelize-cli globalement via pnpm
RUN pnpm add -g sequelize-cli

WORKDIR /app

# Copier les fichiers package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances locales avec pnpm
RUN pnpm install --frozen-lockfile

# Copier le reste du projet
COPY . .

# Exposer le port de l'application
EXPOSE 3000

# Lancer les migrations puis démarrer le serveur
CMD ["bash", "-c", "sleep 5 && sequelize-cli db:migrate --config=config/config.js && sequelize-cli db:seed:all --config=config/config.js && bun src/server.js"]
