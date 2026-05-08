FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci
COPY frontend ./frontend
RUN npm run build -w @tiki/frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 8080
CMD ["/bin/sh", "-c", "cat > /usr/share/nginx/html/assets/app-config.js <<EOF\nwindow.__APP_CONFIG__ = {\n  apiBaseUrl: '${API_BASE_URL:-/api}',\n  keycloak: {\n    url: '${KEYCLOAK_URL:-/auth}',\n    realm: '${KEYCLOAK_REALM:-tiki}',\n    clientId: '${KEYCLOAK_CLIENT_ID:-tiki-frontend}'\n  }\n};\nEOF\nnginx -g 'daemon off;'"]
