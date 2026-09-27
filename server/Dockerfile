# Multi-stage Dockerfile for FIXIT Express Backend
FROM node:20-alpine AS base

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start Express server
CMD ["node", "server.js"]
