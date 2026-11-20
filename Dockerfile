FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/nginx-shortcuts.conf /etc/nginx/shortcuts.conf
COPY --from=build /app/nginx-subdomains.conf /etc/nginx/conf.d/subdomains.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
