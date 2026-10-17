FROM node:25-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web-admin/package.json ./apps/web-admin/package.json
RUN npm ci --workspace=@atlas/api --include-workspace-root=false
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=@atlas/api && npm run build --workspace=@atlas/api
RUN npm prune --omit=dev --workspace=@atlas/api --include-workspace-root=false

FROM node:25-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
RUN mkdir -p storage/uploads storage/exports && chown -R node:node storage
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
