# Stage 1: Build the application
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
# Use --omit=dev in the final stage, install all for build
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the build script
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
RUN chown nextjs:nextjs /app

# Copy built assets from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/apphosting.yaml ./apphosting.yaml

# Install production dependencies
RUN npm install --omit=dev

USER nextjs

# Expose the port the app runs on
# The dev script uses 9002, so we'll assume the start script does too.
# Adjust if your production start command uses a different port.
EXPOSE 9002

# Set the host to 0.0.0.0 to be accessible from outside the container
ENV HOSTNAME 0.0.0.0

# Command to start the application
CMD ["npm", "start", "--", "-p", "9002"]
