# Use the official Node.js image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json if available
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Nest CLI globally
RUN npm install -g @nestjs/cli

# Copy rest of project
COPY . .

# Expose the API port
EXPOSE 3013

# start command.
# Compiled once here rather than by `nest start --watch` at every boot:
# the watcher kept the compiler resident in production.
RUN npm run build

CMD ["npm", "run", "start:prod"]
