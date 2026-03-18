# ─── ETAPA ÚNICA: producción ───────────────────────────────────────────────────
# node:22-slim es Debian liviano — necesario para "sharp" que compila código nativo.
# NO uses alpine para el backend porque sharp falla al compilar en musl libc (alpine usa musl).
FROM node:22-slim

# Directorio de trabajo dentro del container.
# Todo lo que sigue sucede aquí adentro.
WORKDIR /app

# Copiamos SOLO los archivos de dependencias primero.
# Esto aprovecha la caché de Docker: si package.json no cambia,
# Docker reutiliza la capa de node_modules sin reinstalar todo.
COPY package*.json ./

# Instalamos dependencias de producción únicamente.
# --omit=dev excluye nodemon y otras devDependencies.
# Las dependencias se instalan EN LINUX, por eso sharp compila bien.
RUN npm install --omit=dev

# Ahora copiamos el resto del código fuente.
# Se hace DESPUÉS de npm install para no invalidar la caché al cambiar código.
COPY src/ ./src/

# Creamos el directorio de fotos. El volumen del compose lo montará aquí.
RUN mkdir -p ./private/photos

# Documentamos que el backend escucha en este puerto.
# No abre el puerto — eso lo hace el compose con "ports" o la red interna.
EXPOSE 3000

# Comando para iniciar la app en producción.
CMD ["node", "src/server.js"]
