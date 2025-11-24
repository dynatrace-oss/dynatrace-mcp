FROM node:22-alpine



WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.prod.json ./

# Instalar dependencias
RUN npm ci --omit=dev --ignore-scripts

# Copiar código fuente
COPY src/ ./src/

RUN npx tsc --project tsconfig.prod.json


# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5001

# Comando de inicio
CMD ["node", "dist/index.js", "--http", "--port", "5001", "--host", "0.0.0.0"]