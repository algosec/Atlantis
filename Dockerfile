########################
## BASE BUILD
########################
FROM node:14-alpine AS build
ARG BUILD_DESCRIPTION
WORKDIR /build

COPY package*.json ./
COPY shared ./shared
COPY ms-auth ./ms-auth
COPY ms-settings ./ms-settings
COPY ms-catalog ./ms-catalog
COPY web ./web
COPY tsconfig.json ./
COPY .eslintignore ./
COPY .eslintrc.json ./

ENV NODE_ENV=production

RUN npm ci --also=dev && \
    npm run test-and-build && \
    npm prune && npm cache clean --force

########################
## MS-AUTH
########################
FROM node:14-alpine AS ms-auth
ARG BUILD_DESCRIPTION
WORKDIR /app

ENV NODE_ENV=production
ENV BUILD_DESCRIPTION="${BUILD_DESCRIPTION}"

COPY --from=build /build/node_modules node_modules
COPY --from=build /build/ms-auth/dist/ .

EXPOSE 3001

WORKDIR /app/ms-auth/src
CMD [ "node", "index.js" ]

########################
## MS-SETTINGS
########################
FROM node:14-alpine AS ms-settings
ARG BUILD_DESCRIPTION
WORKDIR /app

ENV NODE_ENV=production
ENV BUILD_DESCRIPTION="${BUILD_DESCRIPTION}"

COPY --from=build /build/node_modules node_modules
COPY --from=build /build/ms-settings/dist/ .

EXPOSE 3002

WORKDIR /app/ms-settings/src
CMD [ "node", "index.js" ]

########################
## MS-CATALOG
########################
FROM node:14-alpine AS ms-catalog
ARG BUILD_DESCRIPTION
WORKDIR /app

ENV NODE_ENV=production
ENV BUILD_DESCRIPTION="${BUILD_DESCRIPTION}"

RUN apk add chromium
COPY --from=build /build/node_modules node_modules
COPY --from=build /build/ms-catalog/dist/ .

EXPOSE 3000

WORKDIR /app/ms-catalog/src
CMD [ "node", "index.js" ]

########################
## NGINX
########################
FROM nginx:1.19-alpine AS nginx

WORKDIR /www/data

COPY --from=build /build/web/dist/ .
COPY nginx/nginx.conf /etc/nginx/nginx.conf
