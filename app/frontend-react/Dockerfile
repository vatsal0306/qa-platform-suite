FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_SEEDED_BUGS=true
ENV VITE_SEEDED_BUGS=$VITE_SEEDED_BUGS
EXPOSE 5173
CMD ["npm", "run", "dev"]
