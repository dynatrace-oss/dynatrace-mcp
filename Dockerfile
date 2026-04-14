FROM node:22.21.1-alpine3.22 AS build

# Set working directory
WORKDIR /app

# Copy the source code
COPY . .

# Install dependencies
RUN npm ci

# Build the application
RUN npm run build

# Install only the runtime dependencies declared in dist/package.json (solely `open`)
# Everything else is already bundled into dist/index.js by esbuild
RUN cd dist && npm install --ignore-scripts && npm cache clean --force

# RUNTIME STAGE
FROM node:22.21.1-alpine3.22

# Set working directory
WORKDIR /app

# Copy the bundled application along with its minimal runtime node_modules
COPY --from=build --chown=node:node /app/dist /app/dist

# Run image as non-root user
USER node

# Start the application
# Use ENTRYPOINT so users can pass additional arguments (e.g. --http) when running the container
ENTRYPOINT ["node", "dist/index.js"]
