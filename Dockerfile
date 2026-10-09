# --- Build Stage ---
# Use a specific version for reproducibility
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker's build cache
COPY package.json yarn.lock ./

# Install production dependencies only for a smaller build
RUN yarn install --production --frozen-lockfile

# Copy the application source code
COPY . .

# --- Production Stage ---
FROM node:22-alpine
WORKDIR /app

# Copy built artifacts from the 'builder' stage
COPY --from=builder /app /app

# Expose port 3000
EXPOSE 3000

# Add a health check to let the orchestrator know if the app is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Define the command to run the application
CMD ["node", "server.js"]