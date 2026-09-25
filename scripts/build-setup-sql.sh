#!/usr/bin/env bash
# docs/setup/setup-all.sql を再生成する。
# 初期スキーマ + docs/migrations/*.sql（日付順）を1ファイルに連結する。
# マイグレーションを追加したら必ず実行してコミットすること。
set -euo pipefail
cd "$(dirname "$0")/.."

out=docs/setup/setup-all.sql
{
  echo "-- ============================================================"
  echo "-- es-app DB 一括セットアップ（新規 Supabase プロジェクト用）"
  echo "-- ⚠️ 自動生成ファイル: 直接編集しないこと"
  echo "--    再生成: bash scripts/build-setup-sql.sh"
  echo "-- ============================================================"
  for f in docs/setup/schema-base.sql docs/migrations/*.sql; do
    echo
    echo "-- ===== $f ====="
    cat "$f"
    echo
  done
  echo "select 'setup completed' as result;"
} > "$out"
echo "generated: $out"
