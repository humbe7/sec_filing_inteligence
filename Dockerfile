FROM node:20-bookworm-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build && npm prune --omit=dev
RUN chown -R node:node /usr/src/app

ENV NODE_ENV=production
USER node

CMD ["npm", "run", "start"]
