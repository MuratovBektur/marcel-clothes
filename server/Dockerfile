FROM node:24-alpine

WORKDIR /app

# ffmpeg — для перекодирования загруженных видео (card/gallery/thumb варианты), см. libs/video-variants.ts
RUN apk add --no-cache ffmpeg

COPY package*.json ./

RUN npm install
COPY . .

RUN npm run build