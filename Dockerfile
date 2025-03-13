FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pipx, spotdl, yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Étape 1 : copier les dépendances
COPY package.json bun.lockb ./
RUN bun install

# Étape 2 : copier le reste du code
COPY . .

# Ajout manuel de la variable DATABASE_URL (définitive et propre)
ENV DATABASE_URL=postgresql://devuser:devpass@db:5432/ourmusic

EXPOSE 3000

CMD bash -c "\
  echo \"📡 Attente de la base de données...\" && \
  until pg_isready -h db -p 5432; do sleep 2; done && \
  echo \"🛠 Génération des migrations drizzle...\" && \
  bunx drizzle-kit generate && \
  echo \"📂 Lancement des migrations drizzle...\" && \
  bunx drizzle-kit push && \
  echo \"🚀 Démarrage de l'application...\" && \
  bun run start"
