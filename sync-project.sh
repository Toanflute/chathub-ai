#!/usr/bin/env bash
set -e

sync_project_changes() {
  local commit_msg="${1:-Update project changes $(date '+%Y-%m-%d %H:%M:%S')}"

  echo "1. Kiểm tra thư mục làm việc Git..."
  if [ ! -d ".git" ]; then
    echo "Lỗi: Thư mục hiện tại không phải là kho Git."
    return 1
  fi

  local current_branch
  current_branch=$(git branch --show-current)
  if [ "$current_branch" != "main" ]; then
    echo "Chuyển sang nhánh main (đang ở: $current_branch)..."
    git checkout main
  fi

  echo "2. Kiểm tra các file đã thay đổi..."
  git status -s

  if [ -z "$(git status --porcelain)" ]; then
    echo "Không có thay đổi mới nào chưa lưu trong thư mục hiện tại."
  else
    echo "3. Đang đóng gói các file thay đổi..."
    git add -A
    git commit -m "$commit_msg"
  fi

  echo "4. Đồng bộ với GitHub (origin/main)..."
  git pull --rebase origin main
  git push origin main

  echo "Hoàn tất! Toàn bộ thay đổi đã được đẩy lên GitHub (nhánh main)."
}

sync_project_changes "$1"