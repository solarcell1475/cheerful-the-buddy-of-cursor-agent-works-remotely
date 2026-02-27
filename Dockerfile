# Standalone cheerful-server: single container, no external dependencies
# Runs with tsx directly (no pre-compilation needed)

# Stage 1: install dependencies
FROM node:20 AS deps

RUN apt-get update && apt-get install -y python3 make g++ build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json yarn.lock ./
COPY scripts ./scripts

RUN mkdir -p packages/cheerful-app packages/cheerful-server packages/cheerful-cli packages/cheerful-agent packages/cheerful-wire

COPY packages/cheerful-app/package.json packages/cheerful-app/
COPY packages/cheerful-server/package.json packages/cheerful-server/
COPY packages/cheerful-cli/package.json packages/cheerful-cli/
COPY packages/cheerful-agent/package.json packages/cheerful-agent/
COPY packages/cheerful-wire/package.json packages/cheerful-wire/

COPY packages/cheerful-server/prisma packages/cheerful-server/prisma

RUN SKIP_CHEERFUL_WIRE_BUILD=1 yarn install --frozen-lockfile --ignore-engines

# Stage 2: copy source and generate prisma client
FROM deps AS builder

COPY packages/cheerful-wire ./packages/cheerful-wire
COPY packages/cheerful-server ./packages/cheerful-server

RUN npx prisma generate --schema=packages/cheerful-server/prisma/schema.prisma

# Stage 3: runtime
FROM node:20-slim AS runner

WORKDIR /repo

ENV NODE_ENV=production
ENV DATA_DIR=/data

COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/package.json /repo/package.json
COPY --from=builder /repo/packages/cheerful-wire /repo/packages/cheerful-wire
COPY --from=builder /repo/packages/cheerful-server /repo/packages/cheerful-server

VOLUME /data
EXPOSE 3005

CMD ["sh", "-c", "node_modules/.bin/tsx packages/cheerful-server/sources/standalone.ts migrate && exec node_modules/.bin/tsx packages/cheerful-server/sources/standalone.ts serve"]
