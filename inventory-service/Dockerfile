# =========================
# BUILDER STAGE
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# =========================
# PRODUCTION STAGE
# =========================
FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app /app

USER node

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

CMD ["npm", "start"]