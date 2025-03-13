FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
    build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
    libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pipx, spotdl et yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app
COPY package.json ./

# Installation des dépendances avec Bun
RUN bun install

COPY . .
COPY .env .env

EXPOSE 3000

CMD bash -c "\
  echo \"📡 Attente de la base de données...\" && \
  until pg_isready -h \"$DB_HOST\" -p 5432; do sleep 3; done && \
  echo \"📂 Lancement des migrations...\" && \
  bun run db:push && \
  echo \"🚀 Démarrage de l'application...\" && \
  bun run start"


