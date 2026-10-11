# NURI: storefront + admin (Vite build) served by the API server (Hono on node:sqlite).
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DATA_DIR=/data

# tsx (dev dependency) runs the TypeScript server, so install everything.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

# The SQLite file lives on a volume so it survives redeploys.
VOLUME ["/data"]
EXPOSE 8787

# Set ADMIN_PASSWORD (and any integration keys) at runtime, never in the image.
CMD ["npm", "start"]
