FROM node:20-bullseye

# Dépendances système
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate
ENV PATH="/root/.local/share/pnpm:$PATH"

# Installation de spotdl et yt-dlp via pipx
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Dossier de travail
WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml ./

# Nettoyage préalable
RUN rm -rf node_modules

# Installation des dépendances
RUN pnpm install

# Copie du reste de l'application
COPY . .

# Exposition du port
EXPOSE 3000

# Lancement de l'app après que la DB soit prête
CMD ["bash", "-c", "\
  until pg_isready -h ${DB_HOST:-db} -p 5432; do echo '⏳ En attente de la base de données...'; sleep 3; done && \
  bunx sequelize-cli db:migrate || echo '⚠️ Aucune migration ou déjà à jour' && \
  echo '🚀 Lancement du backend...' && \
  bun src/index.js"]
