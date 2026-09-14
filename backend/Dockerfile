FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install --no-save typescript @types/node @types/express @types/cors @types/pg @types/jsonwebtoken @types/bcryptjs @types/node-cron
COPY . .
RUN npx tsc
EXPOSE 5000
CMD ["node", "dist/index.js"]
