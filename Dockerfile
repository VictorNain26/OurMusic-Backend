# ============================
# 👷 Étape de base (outils système + Bun)
# ============================
FROM node:20-bullseye AS base

# 🧱 Install system dependencies
RUN apt-get update && apt-get install -y \
  curl unzip bash python3 python3-pip python3-venv ffmpeg firefox-esr \
  build-essential libgbm1 libasound2 libxshmfence1 libnss3 libnspr4 \
  libatk-bridge2.0-0 libgtk-3-0 postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# ⚡ Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# 🎵 Install spotdl + yt-dlp
RUN pip3 install --no-cache-dir pipx && pipx install spotdl yt-dlp
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# ============================
# 📦 Étape dépendances (optimise le cache)
# ============================
FROM base AS dependencies

COPY package.json bun.lock ./

# 🔒 Install dependencies without generating new lockfile
RUN bun install --frozen-lockfile --no-cache

# ============================
# 🏗️ Étape build finale (minimal runtime)
# ============================
FROM base AS final

WORKDIR /app

# 🔗 Copy dependencies from builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /root/.bun /root/.bun

# 📁 Copy application source code
COPY . .

# ⚙️ Ensure entrypoint is executable
RUN chmod +x /app/entrypoint.sh

# 🧼 Clean up: remove dev deps if needed (optionnel)
# RUN bun prune --production

# 🏷️ Docker labels (optional metadata)
LABEL org.opencontainers.image.title="OurMusic Backend"
LABEL org.opencontainers.image.description="Backend API for OurMusic project"
LABEL org.opencontainers.image.version="1.0.0"
LABEL maintainer="victor.lenain26@gmail.com"

# 🚦 Healthcheck (ping health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://localhost:3000/health || exit 1

# 🚪 Expose port
EXPOSE 3000

# 🚀 Start the application
CMD ["/app/entrypoint.sh"]
