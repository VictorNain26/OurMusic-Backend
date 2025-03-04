# Utiliser une image officielle Node (ici Node 18 sur Debian Bullseye)
FROM node:18-bullseye

# Mettre à jour apt-get et installer toutes les bibliothèques nécessaires pour Puppeteer/Lightpanda
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    bash \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    firefox-esr \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    gconf-service \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgconf-2-4 \
    libnspr4 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    libxshmfence1

# Installer Bun via le script officiel et mettre à jour le PATH
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installer Lightpanda (version Linux x86_64) et le rendre exécutable
RUN curl -L -o /usr/local/bin/lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
    chmod a+x /usr/local/bin/lightpanda

# Installer pipx via pip3 et installer spotdl et yt-dlp via pipx
RUN pip3 install pipx && pipx ensurepath && \
    pipx install spotdl --system-site-packages && \
    pipx install yt-dlp --system-site-packages

# Ajouter le répertoire de pipx dans le PATH pour que spotdl et yt-dlp soient trouvés
ENV PATH="/root/.local/bin:$PATH"

# Définir le répertoire de travail
WORKDIR /app

# Copier package.json (et bun.lockb* s'il existe) et installer les dépendances avec Bun
COPY package.json bun.lockb* ./
RUN bun install

# Copier le reste du code source
COPY . .

# Exposer le port de l'application (3000 par défaut)
EXPOSE 3000

# Démarrer Lightpanda en mode CDP (pour Puppeteer) en arrière-plan, puis lancer le serveur via Bun
CMD ["bash", "-c", "lightpanda serve --host 127.0.0.1 --port 9222 & bun src/server.js"]
