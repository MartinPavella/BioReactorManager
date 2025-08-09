# Use an ARM-compatible Node.js base image
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install
#RUN npm ci --omit=dev

COPY . .

EXPOSE 5173

#CMD ["npm", "run", "dev", "--", "--host", "--debug"]
CMD ["npm", "run", "dev", "--", "--host"]
