# 1. Base Image
FROM oven/bun:latest

# 2. Set working directory
WORKDIR /app

# 3. Copy package files first (for caching)
COPY package.json bun.lock ./

# 4. Install dependencies
RUN bun install

# 5. Copy the rest of the app
COPY . .

# 6. Build (if you have a build step — optional)
# Uncomment if you have a tsconfig.json and want to precompile
# RUN bun run build

# 7. Expose port (your Elysia app default port is probably 3000, you can change if needed)
EXPOSE 8085

# 8. Start the server
CMD ["bun", "run", "src/index.ts"]
