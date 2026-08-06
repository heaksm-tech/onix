FROM node:22-alpine AS base
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# --- dependencies (all, including dev) -------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- development: hot reload via tsx watch ---------------------------------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- build: emit dist/ ------------------------------------------------------
FROM deps AS build
COPY . .
RUN npm run build

# --- production dependencies only -------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Migrations stay as TypeScript and are executed with tsx, which is a runtime
# dependency for exactly this reason.
COPY migrations ./migrations
COPY package.json ./
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
