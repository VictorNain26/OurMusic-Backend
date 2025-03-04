# Utiliser l'image officielle de Bun
FROM oven/bun:latest

# Installer les paquets nécessaires (curl, unzip, bash, python3, py3-pip, pipx, ffmpeg, firefox)
RUN apk add --no-cache curl unzip bash python3 py3-pip pipx ffmpeg firefox

# Installer Lightpanda à partir des nightly builds pour Linux x86_64
RUN curl -L -o /usr/local/bin/lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
    chmod a+x /usr/local/bin/lightpanda

# Configurer pipx et installer spotdl et yt-dlp
ENV PIPX_BIN_DIR=/usr/local/bin
ENV PIPX_HOME=/usr/local/pipx
RUN pipx ensurepath && \
    pipx install spotdl --system-site-packages && \
    pipx install yt-dlp --system-site-packages

# Vérifier que spotdl et yt-dlp sont bien installés
RUN spotdl --version && which spotdl
RUN yt-dlp --version && which yt-dlp

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json bun.lockb* ./

# Installer les dépendances avec Bun
RUN bun install

# Copier le reste du code source
COPY . .

# Exposer le port de l'application (par défaut 3000)
EXPOSE 3000

# Démarrer Lightpanda en mode CDP (port 9222) en arrière-plan,
# puis lancer l'application Bun (index.js)
CMD ["sh", "-c", "lightpanda serve --host 127.0.0.1 --port 9222 & bun index.js"]
