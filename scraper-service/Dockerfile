FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install

RUN npx playwright install chromium

COPY server.js ./

EXPOSE 7860

CMD ["node", "server.js"]
