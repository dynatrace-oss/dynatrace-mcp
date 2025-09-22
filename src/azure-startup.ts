#!/usr/bin/env node
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// Configurar puerto desde Azure App Service
const port = process.env.PORT || process.env.HTTP_PLATFORM_PORT || '8080';
const host = '0.0.0.0';

// Establecer argumentos para el servidor
process.argv = [
    ...process.argv.slice(0, 2),
    '--http',
    '--port', port,
    '--host', host
];

// Importar y ejecutar el servidor principal
import('./index.js').then(() => {
    console.log(`Azure App Service startup completed on port ${port}`);
}).catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});