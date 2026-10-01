FROM node:24-slim
WORKDIR /app/api
ENV NODE_ENV=production
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev
COPY api/src ./src
COPY db/schema.sql /app/db/schema.sql
CMD ["node", "src/server.ts"]
