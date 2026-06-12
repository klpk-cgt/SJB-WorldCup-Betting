#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

ENV_FILE=".env.production"
SKIP_INSTALL="0"
SKIP_BUILD="0"
SKIP_IMPORT="0"
SKIP_VERIFY="0"
SOURCE_DB_JSON=""

usage() {
  cat <<'EOF'
用法:
  bash scripts/baota-mysql-migrate.sh [选项]

选项:
  --env <file>         指定环境变量文件，默认 .env.production
  --source <file>      指定要导入的 db.json 路径
  --skip-install       跳过 npm install
  --skip-build         跳过 npm run build
  --skip-import        跳过 JSON 导入，只建表
  --skip-verify        跳过导入校验
  -h, --help           显示帮助

示例:
  bash scripts/baota-mysql-migrate.sh
  bash scripts/baota-mysql-migrate.sh --env .env.production --source ./db.json
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_FILE="${2:?缺少环境文件路径}"
      shift 2
      ;;
    --source)
      SOURCE_DB_JSON="${2:?缺少 db.json 路径}"
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL="1"
      shift
      ;;
    --skip-build)
      SKIP_BUILD="1"
      shift
      ;;
    --skip-import)
      SKIP_IMPORT="1"
      shift
      ;;
    --skip-verify)
      SKIP_VERIFY="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[ERROR] 未知参数: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] 环境文件不存在: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] 未检测到 node，请先在宝塔安装 Node.js。"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] 未检测到 npm，请先在宝塔安装 Node.js/npm。"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[ERROR] DATABASE_URL 未配置。"
  exit 1
fi

export APP_STORAGE_MODE="${APP_STORAGE_MODE:-mysql}"
export APP_DATA_DIR="${APP_DATA_DIR:-./runtime}"

RUNTIME_DIR="$APP_DATA_DIR"
case "$RUNTIME_DIR" in
  /*) ;;
  *) RUNTIME_DIR="$PROJECT_ROOT/$RUNTIME_DIR" ;;
esac

mkdir -p "$RUNTIME_DIR"
mkdir -p "$RUNTIME_DIR/backups"

if [[ -n "$SOURCE_DB_JSON" ]]; then
  case "$SOURCE_DB_JSON" in
    /*) IMPORT_SOURCE="$SOURCE_DB_JSON" ;;
    *) IMPORT_SOURCE="$PROJECT_ROOT/$SOURCE_DB_JSON" ;;
  esac
elif [[ -n "${IMPORT_DB_JSON_PATH:-}" ]]; then
  case "$IMPORT_DB_JSON_PATH" in
    /*) IMPORT_SOURCE="$IMPORT_DB_JSON_PATH" ;;
    *) IMPORT_SOURCE="$PROJECT_ROOT/$IMPORT_DB_JSON_PATH" ;;
  esac
elif [[ -f "$RUNTIME_DIR/db.json" ]]; then
  IMPORT_SOURCE="$RUNTIME_DIR/db.json"
elif [[ -f "$PROJECT_ROOT/db.json" ]]; then
  IMPORT_SOURCE="$PROJECT_ROOT/db.json"
else
  IMPORT_SOURCE="$RUNTIME_DIR/db.json"
fi

export IMPORT_DB_JSON_PATH="$IMPORT_SOURCE"

echo "[INFO] 项目目录: $PROJECT_ROOT"
echo "[INFO] 环境文件: $ENV_FILE"
echo "[INFO] 运行目录: $RUNTIME_DIR"
echo "[INFO] 导入源文件: $IMPORT_DB_JSON_PATH"

if [[ "$SKIP_INSTALL" != "1" ]]; then
  echo "[STEP] 安装依赖"
  npm install --include=dev
else
  echo "[SKIP] 跳过 npm install"
fi

echo "[STEP] 生成 Prisma Client"
npm run prisma:generate

echo "[STEP] 推送 MySQL 表结构"
npm run db:push:mysql

if [[ "$SKIP_IMPORT" != "1" ]]; then
  if [[ ! -f "$IMPORT_DB_JSON_PATH" ]]; then
    echo "[ERROR] 未找到导入源文件: $IMPORT_DB_JSON_PATH"
    exit 1
  fi

  TIMESTAMP="$(date +%F-%H%M%S)"
  cp "$IMPORT_DB_JSON_PATH" "$RUNTIME_DIR/backups/db.json.before-mysql-import.$TIMESTAMP"

  if [[ "$IMPORT_DB_JSON_PATH" != "$RUNTIME_DIR/db.json" ]]; then
    cp "$IMPORT_DB_JSON_PATH" "$RUNTIME_DIR/db.json"
    export IMPORT_DB_JSON_PATH="$RUNTIME_DIR/db.json"
    echo "[INFO] 已复制导入源到运行目录: $IMPORT_DB_JSON_PATH"
  fi

  echo "[STEP] 导入 db.json 到 MySQL"
  npm run db:import:mysql

  if [[ "$SKIP_VERIFY" != "1" ]]; then
    echo "[STEP] 校验导入结果"
    npm run db:verify:mysql
  else
    echo "[SKIP] 跳过导入校验"
  fi
else
  echo "[SKIP] 跳过 JSON 导入"
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "[STEP] 构建生产文件"
  npm run build
else
  echo "[SKIP] 跳过构建"
fi

cat <<EOF

[SUCCESS] MySQL 迁移脚本执行完成。

下一步建议:
1. 在宝塔终端执行: npm run start
2. 或在宝塔 Node 项目管理中，把启动命令设为: npm run start
3. 访问 /api/health 确认返回 db=mysql

EOF
