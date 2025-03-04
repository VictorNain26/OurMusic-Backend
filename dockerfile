# Utiliser l'image officielle de Bun (basée sur Debian)
FROM oven/bun:latest

# Mettre à jour apt-get et installer les paquets nécessaires
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    bash \
    python3 \
    python3-pip \
    ffmpeg \
    firefox-esr

# Installer Lightpanda à partir des nightly builds pour Linux x86_64
RUN curl -L -o /usr/local/bin/lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
    chmod a+x /usr/local/bin/lightpanda

# Configurer pipx et installer spotdl et yt-dlp
ENV PIPX_BIN_DIR=/usr/local/bin
ENV PIPX_HOME=/usr/local/pipx
RUN pip3 install pipx && pipx ensurepath && \
    pipx install spotdl --system-site-packages && \
    pipx install yt-dlp --system-site-packages

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances et installer les dépendances avec Bun
COPY package.json bun.lockb* ./
RUN bun install

# Copier le reste du code source
COPY . .

# Exposer le port de l'application (3000 par défaut)
EXPOSE 3000

# Démarrer Lightpanda en mode CDP (port 9222) en arrière-plan, puis lancer l'application Bun
CMD ["sh", "-c", "lightpanda serve --host 127.0.0.1 --port 9222 & bun index.js"]
