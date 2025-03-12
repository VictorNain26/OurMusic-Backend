FROM node:20-bullseye

# Dépendances système
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

# Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# pnpm via Corepack (version stable)
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate
ENV PATH="/root/.local/share/pnpm:$PATH"

# spotdl & yt-dlp
RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Dossier de travail
WORKDIR /app

# Copie des fichiers nécessaires pour installer les deps
COPY package.json bun.lockb ./

# Installation des dépendances
RUN rm -rf node_modules
RUN pnpm install --force

# Copie du reste du projet
COPY . .

# Exécution des migrations Sequelize (grâce à npx)
RUN npx sequelize-cli db:migrate || echo "⚠️ Aucune migration ou déjà à jour"

# Vérification qualité code dans l’image (check + test + lint)
RUN echo "✅ Vérification du code avant build..." \
 && bun check src \
 && bun test \
 && bun run lint

# Exposition du port
EXPOSE 3000

# Lancement de l'application
CMD ["bun", "run", "./src/index.js"]

