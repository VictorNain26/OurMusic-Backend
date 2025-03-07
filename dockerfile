FROM node:20-bullseye

# Installer les dépendances nécessaires
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

# Installer sequelize-cli globalement
RUN npm install -g sequelize-cli

WORKDIR /app

# Copier et installer les dépendances
COPY package.json bun.lockb* ./
RUN bun install

# Copier tout le reste du code
COPY . .

# Copier .env
COPY .env .env

# Exposer le port
EXPOSE 3000

# Lancer les migrations à l'exécution (runtime), puis démarrer le serveur
CMD ["bash", "-c", "sequelize-cli db:migrate --config=config/config.js && sequelize-cli db:seed:all --config=config/config.js && bun src/server.js"]
