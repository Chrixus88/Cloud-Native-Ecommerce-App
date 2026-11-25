#=======================
#BUILDER STAGE
#=======================
FROM node:22-alpine AS builder

WORKDIR  /app

#copy packages
COPY package*.json ./
#Install dependencies
RUN  npm ci

COPY . .

#=======================
#PRODUCTION STAGE
#=======================

FROM node:22-alpine AS production

WORKDIR /app

COPY --from=builder /app /app

#run as non-root
USER node

#PORT
EXPOSE 3002

#HealthCheck 
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD [ "npm","start" ]

