#!/usr/bin/env bash
set -euo pipefail

MACHINE_ID="436a2630-fad8-475b-8f00-5ab158e9919e"
ENV_NAME="dev"
PROJECT_ID="${INFISICAL_PROJECT_ID:-}"

if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: INFISICAL_PROJECT_ID 未设置"
  exit 1
fi

if ! command -v infisical >/dev/null 2>&1; then
  echo "ERROR: infisical CLI 未安装"
  exit 1
fi

REPO_NAME="${REPO_NAME:-$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")}"
TARGET_PATH="/${REPO_NAME}/credentials"
FALLBACK_PATH="/credentials"

echo "Machine Identity: ${MACHINE_ID}"
echo "Env: ${ENV_NAME}"
echo "Target path: ${TARGET_PATH}"
echo "Fallback path: ${FALLBACK_PATH}"

if ! infisical secrets --env="${ENV_NAME}" --path="${TARGET_PATH}" --projectId="${PROJECT_ID}" --output=json --silent >/dev/null 2>&1; then
  echo "INFO: 路径不存在，创建 ${TARGET_PATH}"
  infisical secrets folders create --name="${REPO_NAME}" --env="${ENV_NAME}" --path="/" --projectId="${PROJECT_ID}" --silent >/dev/null 2>&1 || true
  infisical secrets folders create --name="credentials" --env="${ENV_NAME}" --path="/${REPO_NAME}" --projectId="${PROJECT_ID}" --silent >/dev/null 2>&1 || true
fi

REQUIRED_KEYS=("NPM_TOKEN" "GITHUB_PERSONAL_ACCESS_TOKEN" "STEEL_API_KEY")
SECRETS_JSON="$(infisical secrets --env="${ENV_NAME}" --path="${TARGET_PATH}" --projectId="${PROJECT_ID}" --output=json --silent)"
FALLBACK_JSON="$(infisical secrets --env="${ENV_NAME}" --path="${FALLBACK_PATH}" --projectId="${PROJECT_ID}" --output=json --silent)"
MISSING_KEYS=()
PENDING_KEYS=()

extract_secret_value() {
  local json="$1"
  local key="$2"
  printf '%s' "${json}" | python3 -c "import json,sys; d=json.load(sys.stdin); d=d if isinstance(d,dict) else {}; s=d.get('secrets') or []; print(next(((x or {}).get('secretValue','') for x in s if isinstance(x,dict) and x.get('secretKey')=='${key}'),''))"
}

for key in "${REQUIRED_KEYS[@]}"; do
  current_val="$(extract_secret_value "${SECRETS_JSON}" "${key}")"
  if [[ -z "${current_val}" || "${current_val}" == "__PENDING_APPLY__" ]]; then
    fallback_val="$(extract_secret_value "${FALLBACK_JSON}" "${key}")"
    if [[ -n "${fallback_val}" && "${fallback_val}" != "__PENDING_APPLY__" ]]; then
      echo "INFO: ${key} 在 ${TARGET_PATH} 缺失/占位，使用 ${FALLBACK_PATH} 值同步"
      infisical secrets set "${key}=${fallback_val}" \
        --env="${ENV_NAME}" \
        --path="${TARGET_PATH}" \
        --projectId="${PROJECT_ID}" \
        --silent >/dev/null 2>&1 || true
      current_val="${fallback_val}"
    fi
  fi

  if [[ -z "${current_val}" ]]; then
    MISSING_KEYS+=("${key}")
  elif [[ "${current_val}" == "__PENDING_APPLY__" ]]; then
    PENDING_KEYS+=("${key}")
  fi
done

if [[ "${#MISSING_KEYS[@]}" -gt 0 ]]; then
  echo "WARN: 缺少以下 key，开始在 ${TARGET_PATH} 创建占位密钥："
  for key in "${MISSING_KEYS[@]}"; do
    infisical secrets set "${key}=__PENDING_APPLY__" \
      --env="${ENV_NAME}" \
      --path="${TARGET_PATH}" \
      --projectId="${PROJECT_ID}" \
      --silent >/dev/null 2>&1 || true
    echo "- ${key} (created placeholder: __PENDING_APPLY__)"
  done
  echo "WARN: 已创建占位密钥，请到 Infisical 填入真实值后重新执行。"
  exit 2
fi

if [[ "${#PENDING_KEYS[@]}" -gt 0 ]]; then
  echo "WARN: 以下 key 仍为占位值 __PENDING_APPLY__，请先申请真实值："
  for key in "${PENDING_KEYS[@]}"; do
    echo "- ${key}"
  done
  exit 2
fi

echo "INFO: key 检查通过"
infisical export --env="${ENV_NAME}" --path="${TARGET_PATH}" --projectId="${PROJECT_ID}" --format=dotenv --silent
