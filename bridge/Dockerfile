# Build from the repo root:  docker build -f bridge/Dockerfile -t twiga-bridge .
FROM node:22-alpine
WORKDIR /app
COPY bridge/package.json ./bridge/package.json
RUN cd bridge && npm install --omit=dev
COPY bridge ./bridge
COPY web/api/_lib ./web/api/_lib
COPY web/package.json ./web/package.json
ENV PORT=8080
EXPOSE 8080
CMD ["node", "bridge/server.js"]
