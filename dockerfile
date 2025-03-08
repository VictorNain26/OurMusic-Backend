FROM node:20-bullseye

# Installation des dépendances nécessaires pour Puppeteer, Spotdl, et yt-dlp
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

# Installation de Bun (runtime ultra-rapide pour JS)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pipx, spotdl et yt-dlp
RUN pip3 install pipx \
    && pipx ensurepath \
    && pipx install spotdl yt-dlp

ENV PATH="/root/.local/bin:$PATH"

# Installation officielle de PNPM sans npm, directement via script officiel
RUN curl -fsSL https://get.pnpm.io/install.sh | SHELL=bash bash -
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PATH="$PNPM_HOME/global/5/node_modules/.bin:$PATH"

# Définition explicite du dossier global pour pnpm
RUN pnpm config set global-bin-dir $PNPM_HOME/global-bin
ENV PATH="$PNPM_HOME/global-bin:$PATH"

# Installation de sequelize-cli via pnpm globalement
RUN pnpm add -g sequelize-cli

# Définition du répertoire de travail
WORKDIR /app

# Copier uniquement les fichiers nécessaires pour installer les dépendances
COPY package.json pnpm-lock.yaml ./

# Installation efficace des dépendances avec pnpm
RUN pnpm install --frozen-lockfile

# Copier le reste du projet
COPY . .

# Copie des variables d'environnement
COPY .env .env

# Exposer le port de l'application
EXPOSE 3000

# Commande finale robuste avec attente explicite de la DB avant migration
CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  sequelize-cli db:migrate --config=config/config.js && \
  sequelize-cli db:seed:all --config=config/config.js && \
  bun src/server.js"]
