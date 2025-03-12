FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client

RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

RUN corepack enable && corepack prepare pnpm@8.15.5 --activate
ENV PATH="/root/.local/share/pnpm:$PATH"

RUN pip3 install pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

COPY package.json ./
RUN rm -rf node_modules
RUN pnpm install --force

COPY . .

COPY .env .env

RUN npx sequelize-cli db:migrate || echo "❌ Aucune migration à exécuter ou erreur bénigne"

EXPOSE 3000
CMD ["bun", "run", "start"]

