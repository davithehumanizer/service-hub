FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 3007
CMD ["node","src/index.js"]