FROM node:22-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund

# Chromium + its OS libraries, matched to the installed Playwright version.
RUN npx playwright install --with-deps chromium && rm -rf /var/lib/apt/lists/*

COPY . .
RUN npm run build -w web

ENV NODE_ENV=production \
    CHROMIUM_NO_SANDBOX=1 \
    PORT=8080
EXPOSE 8080
CMD ["npx", "tsx", "server/src/index.ts"]
