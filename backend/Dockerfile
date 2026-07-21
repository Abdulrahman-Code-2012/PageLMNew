# base
FROM node:20-alpine AS base

WORKDIR /app

# builder
FROM base AS builder

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Build the TypeScript code
RUN npm run build

# runtime
FROM base AS runtime

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose the port
EXPOSE 10000

# Start the server
CMD ["npm", "start"]
