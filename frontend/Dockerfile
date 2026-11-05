# =============================================================================
# Stage 1: Build the React application
# NOTE: REACT_APP_* variables are embedded at BUILD TIME by CRA.
# The value of REACT_APP_API_URL comes from the .env file copied below.
# Make sure .env contains the correct production URL before building.
# =============================================================================
FROM node:20 AS builder

WORKDIR /app

COPY windmill-react-ui-master/windmill-react-ui-0.6.0.tgz ./windmill-react-ui-master/windmill-react-ui-0.6.0.tgz

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the source code and config files
COPY src ./src
COPY public ./public
COPY tailwind.config.js ./tailwind.config.js
COPY .env ./.env
COPY postcss.config.js ./postcss.config.js
COPY tsconfig.json ./tsconfig.json
# prebuild copies the scanner's wasm out of node_modules (see package.json).
COPY scripts ./scripts

# Stamped into the bundle and shown at the foot of the sidebar, so a tester's
# bug report names the build it came from. Supplied by docker compose from
# `git describe` on the server; the default covers a plain `docker build`.
# dotenv never overwrites a variable that is already set, so the .env copied
# above cannot shadow this one.
ARG REACT_APP_VERSION=dev
ENV REACT_APP_VERSION=$REACT_APP_VERSION

# Build the production bundle
RUN npm run build

# =============================================================================
# Stage 2: Serve static files with nginx
# No webpack-dev-server, no HMR WebSocket injection.
# =============================================================================
FROM nginx:alpine

# Copy the built static files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx configuration (SPA routing support)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Security headers, included by every location block in nginx.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]