# --- Build the React app ---------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# The browser calls the API on the same origin; nginx forwards /api to the backend
ENV REACT_APP_API_URL=/api
RUN npm run build

# --- Serve it with nginx ---------------------------------------------------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
