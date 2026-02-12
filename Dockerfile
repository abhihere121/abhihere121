FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run dashboard:build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app ./
EXPOSE 3001
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then i=0; until node --dns-result-order=ipv4first scripts/migrate.js; do i=$((i+1)); if [ $i -ge 30 ]; then exit 1; fi; sleep 1; done; fi; node --dns-result-order=ipv4first server.js"]
