#!/bin/bash

WUMP_DIR="./wump-bot"
LOG_FILE="./wump.log"
CONFIG_FILE="./token.json"
PM2_NAME="wump-bot"

clone_repo_if_needed() {
  if [ ! -d "$WUMP_DIR" ]; then
    echo "📥 克隆 wump-bot 项目..."
    git clone https://github.com/fcmfcm1999/wump-bot.git "$WUMP_DIR" || { echo "❌ 克隆失败"; exit 1; }
  else
    echo "📁 项目已存在，跳过克隆"
  fi
}

add_token() {
  id = 0
  while true; do
  echo "请输入你的token(打开浏览器，在wump页面，登录后打开控制台输入: Object.fromEntries(document.cookie.split('; ').map(c => c.split('=')))['sb-api-auth-token.0']; 来获取"
    read -p "Token: " token
    if [[ -z "$token" ]]; then
        echo "❌ token 不能为空，请重新输入。"
        continue
    fi

    read -p "每日执行时间(HH:MM), 注意查看你本机的时区: " time
    if ! [[ "$time" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]]; then
        echo "❌ 时间格式不合法，请使用 HH:MM 格式（24小时制）"
        continue
    fi
    hour="${time%%:*}"
    minute="${time##*:}"
    cron="$minute $hour * * *"

    # 添加 JSON 条目
    entries+=("{\"id\": $id, \"base64token\": \"${token}\", \"time\": \"${cron}\"}")
    ((id++))

    # 是否继续
    read -p "是否继续输入？(y/n): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        break
    fi
  done

# 构造 JSON 数组
  json="["
  json+=$(IFS=, ; echo "${entries[*]}")
  json+="]"

  # 写入文件
  echo "$json" > "$CONFIG_FILE"
  echo "✅ 配置已写入 $CONFIG_FILE"

}

print_author_info() {
  echo "=========================="
  echo " 作者: 0x范特西"
  echo " Twitter / X: @0Xiaofan22921"
  echo " "
  echo " 更多脚本分享欢迎关注我的推特~"
  echo "=========================="
}

ensure_pm2_installed() {
  if ! command -v pm2 &> /dev/null; then
    echo "🔧 未检测到 pm2，正在安装..."
    npm install -g pm2 || { echo "❌ pm2 安装失败，请检查 Node.js 和 npm 是否已安装"; exit 1; }
  else
    echo "✅ pm2 已安装"
  fi
}


print_author_info

echo "请选择操作："
echo "1. 安装并运行 wump-bot"
echo "2. 查看日志"
echo "3. 停止运行 wump-bot"
echo "4. 删除 wump-bot"
read -p "输入选项 (1-4): " choice

case $choice in
  1)
    ensure_pm2_installed
    clone_repo_if_needed
    cd "$WUMP_DIR" || exit
    add_token
    npm install
    echo "🚀 正在启动 wump..."
    pm2 start "node wump.js" --name "$PM2_NAME" --log "$LOG_FILE"
    ;;

  2)
    echo "📄 显示日志 (Ctrl+C 退出)"
    pm2 logs "$PM2_NAME"
    ;;

  3)
    echo "🛑 停止运行 wump..."
    pm2 stop "$PM2_NAME"
    ;;

  4)
    echo "⚠️ 将删除整个 $WUMP_DIR 文件夹及其记录"
    read -p "确认删除？(y/n): " confirm
    if [ "$confirm" == "y" ]; then
      pm2 delete "$PM2_NAME"
      rm -rf "$WUMP_DIR"
      echo "✅ 删除完成"
    else
      echo "❎ 已取消删除"
    fi
    ;;

  *)
    echo "❌ 无效选项"
    ;;
esac

