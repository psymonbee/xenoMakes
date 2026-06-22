# ============================================================================
#  Dockerfile  —  how Coolify builds and runs our little server
# ============================================================================
#  This packages the game + server into one image. Coolify reads this file,
#  builds it, and runs it. See DEPLOY_DESIGN.md §10.
# ============================================================================

FROM node:22-slim

# The folder inside the container where our code will live.
WORKDIR /app

# better-sqlite3 sometimes needs to compile itself. These tools let it.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install ONLY the things package.json lists (copying these first means Docker
# can reuse the cached install when only our game code changes).
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Copy the rest of the game in.
COPY . .

# The database lives here. In Coolify, mount a PERSISTENT VOLUME at /app/data so
# levels + accounts survive restarts and redeploys (this is the important bit!).
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

# The server listens on this port (Coolify maps it to the outside world).
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
