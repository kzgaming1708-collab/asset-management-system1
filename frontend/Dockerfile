# --- Giai đoạn build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# 1 = hiện nút điền sẵn tài khoản mẫu ở trang đăng nhập (chỉ nên bật khi chạy thử)
ARG VITE_SHOW_DEMO=0
ENV VITE_SHOW_DEMO=$VITE_SHOW_DEMO
RUN npm run build

# --- Giai đoạn chạy: nginx phục vụ file tĩnh và proxy /api sang backend ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
