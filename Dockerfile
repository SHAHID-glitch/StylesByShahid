FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci || npm install
RUN cd backend && (npm ci || npm install)

# Copy app source
COPY . .

# Hugging Face Spaces Docker runtime expects an HTTP server on this port.
ENV NODE_ENV=production
ENV PORT=7860

EXPOSE 7860

CMD ["npm", "start"]