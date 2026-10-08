# One container: builds the React app, then the API serves it.
FROM node:22-alpine AS web
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/backend
ENV NODE_ENV=production PORT=4000 DB_FILE=/data/core5-educators.db
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backend/ ./
COPY --from=web /app/frontend/dist /app/frontend/dist
VOLUME /data
EXPOSE 4000
CMD ["node", "src/server.js"]
