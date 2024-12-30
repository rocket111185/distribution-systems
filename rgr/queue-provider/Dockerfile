# Base image
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy application code
COPY index.js .

# Start application
CMD ["node", "index.js"]
