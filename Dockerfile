FROM node:20

RUN apt-get update && \
    apt-get install -y ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8080

CMD ["node", "dist/index.js"]
