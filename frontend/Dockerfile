# ── STAGE 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Vite bakes env vars at build time, so VITE_API_URL must be available here
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the app (Vite build)
RUN npm run build

# ── STAGE 2: Runtime (Nginx) ──
FROM nginx:stable-alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
