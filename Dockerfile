FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY index.html styles.css app.js server.js ./
COPY puzzles ./puzzles

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
