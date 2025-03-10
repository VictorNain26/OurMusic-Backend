FROM node:20-bullseye

# Installer les dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
    build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
    libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installer pipx, spotdl et yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Télécharger Lightpanda (binary from nightly builds)
RUN curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux \
  && chmod a+x ./lightpanda

WORKDIR /app
COPY package.json ./

# Installer les dépendances avec Bun
RUN bun install

COPY . .
COPY .env .env

EXPOSE 3000

# CMD : Attendre que la DB soit prête, lancer les migrations,
# lancer Lightpanda en arrière-plan puis démarrer le backend
CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  bun run db:migrate && \
  ./lightpanda serve --host 0.0.0.0 --port 9222 & \
  bun start"]
