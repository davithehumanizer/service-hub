# Use the official Node.js image
FROM node:20

# Install build tools
RUN apt-get update && apt-get install -y build-essential python3

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json if available
COPY package*.json ./

# Install dependencies
RUN rm -rf node_modules && npm install

# Explicitly install and rebuild bcrypt
RUN npm install bcrypt --unsafe-perm && npm rebuild bcrypt --update-binary

# Install Nest CLI globally
RUN npm install -g @nestjs/cli

# Copy rest of projet
COPY . .
# Expose the API port
EXPOSE 3006

# start command.
# Compiled once here rather than by `nest start --watch` at every boot:
# the watcher kept the compiler resident in production.
RUN npm run build

CMD ["npm", "run", "start:prod"]