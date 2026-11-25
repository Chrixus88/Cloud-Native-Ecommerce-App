#===========================
# BUILDER STAGE
#===========================
FROM  node:22-alpine AS builder

WORKDIR  /app
# Copy dependency files first
COPY package*.json ./
# Install all dependencies (devDependency include)
RUN  npm ci 

COPY . .
#===========================
#PRODUCTION STAGE
#===========================

FROM node:22-alpine AS Production

WORKDIR /app
# Copy from builder stage to production stage
COPY --from=builder /app /app/

#Run as non-root
USER node
#Port
EXPOSE 3001

#HealthCheck 
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD [ "npm", "start" ]