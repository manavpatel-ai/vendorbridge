# ---- Frontend Dockerfile ----
# Multi-stage build: Node build → Nginx serve

# Stage 1: Build the React app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source code and build
COPY . .

# Build arg for the backend API URL (injected at build time)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

# Metadata
LABEL maintainer="VendorBridge Team"
LABEL description="VendorBridge Frontend - React + Vite served via Nginx"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
