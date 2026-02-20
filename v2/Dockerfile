# === Stage 1: Builder ===
# 構建所有 workspace packages 的依賴與編譯
FROM node:18-alpine AS builder

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm@10

# 複製 pnpm 配置與 lock 檔
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# 安裝所有依賴（workspace）
RUN pnpm install --frozen-lockfile

# 複製所有原始碼
COPY . .

# 構建所有 packages
RUN pnpm -r -w build

# === Stage 2: API Gateway Runtime ===
FROM node:18-alpine AS api-gateway

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm@10

# 複製 pnpm 配置
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# 只安裝 production 依賴
RUN pnpm install --frozen-lockfile --prod

# 複製 package.json 檔案
COPY apps/api-gateway/package.json ./apps/api-gateway/
COPY shared/contracts/package.json ./shared/contracts/

# 複製編譯輸出
COPY --from=builder /app/dist ./dist

# 設定工作目錄與暴露埠口
EXPOSE 3399

# 啟動 api-gateway
CMD ["node", "dist/apps/api-gateway/main.js"]

# === Stage 3: STT Service Runtime ===
FROM node:18-alpine AS stt-service

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm@10

# 複製 pnpm 配置
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./

# 只安裝 production 依賴
RUN pnpm install --frozen-lockfile --prod

# 複製 package.json 檔案
COPY apps/stt-service/package.json ./apps/stt-service/
COPY shared/audio/package.json ./shared/audio/
COPY shared/contracts/package.json ./shared/contracts/

# 複製編譯輸出
COPY --from=builder /app/dist ./dist

# 啟動 stt-service（microservice，無須暴露埠）
CMD ["node", "dist/apps/stt-service/main.js"]

# === Stage 4: Development (optional) ===
FROM node:18-alpine AS development

WORKDIR /app

# 安裝 pnpm
RUN npm install -g pnpm@10

# 複製所有配置
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY tsconfig.json nest-cli.json eslint.config.mjs prettier.config.js ./

# 安裝所有依賴（含 dev）
RUN pnpm install --frozen-lockfile

# 複製原始碼
COPY . .

# 暴露埠口
EXPOSE 3399

# 預設執行 shell（用於開發測試）
CMD ["/bin/sh"]
