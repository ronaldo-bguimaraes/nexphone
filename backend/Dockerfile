# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY backend backend
COPY client client
RUN npm run build -w backend && npm run build -w client
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends adb ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist /app/backend/dist
COPY --from=build /app/backend/package.json /app/backend/package.json
COPY --from=build /app/client/dist /app/client/dist
COPY package.json /app/package.json

# Pinned scrcpy server (Apache-2.0). Update the version and checksum together.
ARG SCRCPY_VERSION=3.3.3
ARG SCRCPY_SHA256=7e70323ba7f259649dd4acce97ac4fefbae8102b2c6d91e2e7be613fd5354be0
RUN mkdir -p /opt/nexphone \
    && curl -fsSL -o /opt/nexphone/scrcpy-server.jar \
       "https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_VERSION}/scrcpy-server-v${SCRCPY_VERSION}" \
    && echo "${SCRCPY_SHA256}  /opt/nexphone/scrcpy-server.jar" | sha256sum -c -

WORKDIR /app
ENV NODE_ENV=production
ENV NEXPHONE_SCRCPY_SERVER=/opt/nexphone/scrcpy-server.jar
EXPOSE 8080

USER node
# adb needs a writable home for its server state.
ENV HOME=/home/node
CMD ["sh", "-c", "adb start-server >/dev/null 2>&1 || true; node backend/dist/main.js"]
