# ─── ETAPA 1: BUILD ────────────────────────────────────────────────────────────
# Usamos una imagen Node para compilar el proyecto React con Vite.
# Esta etapa existe SOLO para generar la carpeta dist/ — no llega a producción.
FROM node:22-alpine AS builder

WORKDIR /app

# ARG: variable disponible solo en tiempo de build (no queda en la imagen final).
# El compose la pasa con "args: VITE_API_URL".
# Vite la lee durante el build y la incrusta en el bundle JS.
ARG VITE_API_URL=""

# Convertimos el ARG en ENV para que Vite lo pueda leer al ejecutar "vite build".
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# Genera la carpeta dist/ con todos los archivos estáticos optimizados.
RUN npm run build


# ─── ETAPA 2: SERVIDOR ─────────────────────────────────────────────────────────
# Imagen final: solo Nginx, ultra liviana (~25MB).
# NO contiene Node.js, código fuente ni node_modules — solo los archivos del dist/.
FROM nginx:alpine

# Copiamos ÚNICAMENTE el resultado del build de la etapa anterior.
# Todo lo demás (node_modules, código fuente) queda descartado.
COPY --from=builder /app/dist /usr/share/nginx/html

# Reemplazamos la config por defecto de Nginx con la nuestra.
# La nuestra hace proxy de /api hacia el backend de Docker.
COPY ../docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
