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

# Définir le répertoire de travail avant de télécharger lightpanda
WORKDIR /app

# Télécharger lightpanda dans /app et le rendre exécutable
RUN curl -L -o lightpanda https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-x86_64-linux && \
    chmod a+x ./lightpanda && \
    ls -l /app

COPY package.json ./
RUN bun install

COPY . .
COPY .env .env

EXPOSE 3000

CMD ["bash", "-c", "\
  until pg_isready -h db -p 5432; do echo 'Waiting for DB...'; sleep 3; done && \
  bun run db:migrate && \
  ./lightpanda serve --host 0.0.0.0 --port 9222 & \
  bun start"]
