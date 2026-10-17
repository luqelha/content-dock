FROM node:24-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web-admin/package.json ./apps/web-admin/package.json
RUN npm ci
COPY apps/web-admin ./apps/web-admin
RUN npm run build --workspace=@atlas/web-admin

FROM node:24-slim AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web-admin/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=build --chown=node:node /app/apps/web-admin/public ./apps/web-admin/public
USER node
EXPOSE 3000
CMD ["node", "apps/web-admin/server.js"]
