## Multi‑stage Dockerfile for the React Vite frontend
# Stage 1 – build the app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --silent
COPY . .
# Build the production bundle (Vite output goes to /app/dist)
RUN npm run build

# Stage 2 – serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Custom Nginx config (gzip, caching, fallback to index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Nginx runs in the foreground by default
