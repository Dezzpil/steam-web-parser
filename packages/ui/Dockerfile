FROM node:24-alpine AS builder

WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm install --frozen-lockfile --filter @steam-web-parser/ui...
COPY packages/ui/ packages/ui/
RUN pnpm --filter @steam-web-parser/ui... build


FROM nginx:1.27-alpine AS runner

COPY packages/ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/ui/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
