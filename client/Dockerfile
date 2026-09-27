# Multi-stage Dockerfile for FIXIT React Frontend
# Stage 1: Build production bundle
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite SPA
RUN npm run build

# Stage 2: Serve with lightweight static server (Nginx Alpine)
FROM nginx:alpine

# Copy built dist files to Nginx web root
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for React Router SPA rewrites
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
