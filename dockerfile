FROM node:20-bullseye

# Installation des dépendances nécessaires pour Puppeteer, Spotdl, et yt-dlp
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
    libgtk-3-0 \
    postgresql-client

# Installation de Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Installation de pipx, spotdl et yt-dlp
RUN pip3 install pipx \
    && pipx ensurepath \
    && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

# Installation officielle de PNPM sans npm
RUN curl -fsSL https://get.pnpm.io/install.sh | SHELL=bash bash -
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PATH="$PNPM_HOME/global/5/node_modules/.bin:$PATH"

RUN pnpm config set global-bin-dir $PNPM_HOME/global-bin
ENV PATH="$PNPM_HOME/global-bin:$PATH"

# Installation de sequelize-cli globalement
RUN pnpm add -g sequelize-cli

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
COPY .env .env

EXPOSE 3000

CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  sequelize-cli db:migrate --config=config/config.js && \
  sequelize-cli db:seed:all --config=config/config.js && \
  bun src/server.js"]
