# Start from Node 20 image
FROM node:20

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy all source code and build
COPY . .
RUN npm run build

# Expose the port Railway uses
EXPOSE 8080

# Run server
CMD ["node", "dist/index.js"]
