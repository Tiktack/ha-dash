ARG BUILD_FROM=ghcr.io/home-assistant/base:3.23
ARG BUILD_VERSION=dev

FROM node:24-alpine AS frontend-build
WORKDIR /build

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run check && npm run build

FROM ${BUILD_FROM}
ARG BUILD_VERSION
RUN apk add --no-cache nodejs

WORKDIR /app
COPY --from=frontend-build /build/dist ./public
COPY server/server.mjs ./server.mjs

EXPOSE 8099

LABEL \
    io.hass.type="app" \
    io.hass.name="HA Dash Prototype" \
    io.hass.version="${BUILD_VERSION}" \
    org.opencontainers.image.title="HA Dash Prototype" \
    org.opencontainers.image.description="Standalone Solid 2 interface for Home Assistant devices" \
    org.opencontainers.image.source="https://github.com/Tiktack/ha-dash"

CMD ["node", "/app/server.mjs"]
