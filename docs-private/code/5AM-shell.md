---
sidebar_position: 2
sidebar_label: 凌晨5点自动部署脚本
title: 凌晨5点自动部署脚本
description: 这段 Bash 脚本整体上写得非常规范、清晰、健壮，已经远超一般运维脚本的水平，具备了生产级自动化部署工具的基本素质。
keywords: [代码, 自动部署脚本, 若善云]
---

# 5AM自动部署脚本

> 最后更新于2025年8月28号



## 一、项目结构

### 1、后端脚本路径（deploy-project.sh）

```JavaScript showLineNumbers=true
/home/build/ruo-shan-cloud
```

### 2、前端脚本路径（copyweb.sh）

```JavaScript showLineNumbers=true
/home/build/ruo-shan-cloud-admin
```



## 二、自动化凌晨5点部署

### auto-deploy.sh 主程序脚本

```Shell showLineNumbers=true
#!/usr/bin/env bash
set -euo pipefail

# ========================
# 自动部署脚本 (后端+前端)
# ========================

CONFIG_FILE="/home/build/deploy-config.conf"
LOG_DIR="/home/build/deploy-logs"
mkdir -p "$LOG_DIR" || {
    echo "❌ 错误: 无法创建日志目录 $LOG_DIR，请检查权限！" >&2
    exit 1
}

TODAY=$(date +"%Y-%m-%d")
TIME_NOW=$(date +"%H%M%S")

# -------------------------
# 安全加载配置文件（避免 source 注入风险）
# -------------------------
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 配置文件 $CONFIG_FILE 不存在，退出！" >&2
    exit 1
fi

# === 默认配置（防止配置文件缺失关键字段）===
# 这些值会被 deploy-config.conf 覆盖（如果存在）
# 默认行为：执行部署、目标测试服务器、仅部署后端
RUN_DEPLOY="true"
DEPLOY_ENV="dev"
DEPLOY_SCOPE="backend"
# ==============================================

# 逐行解析 key=value 格式，跳过注释和空行
while IFS='=' read -r key value; do
    # 去除前后空格
    key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    # 跳过空行或注释
    [[ -z "$key" || "$key" =~ ^# ]] && continue

    case "$key" in
        RUN_DEPLOY)   RUN_DEPLOY="$value"   ;;
        DEPLOY_ENV)   DEPLOY_ENV="$value"   ;;
        DEPLOY_SCOPE) DEPLOY_SCOPE="$value" ;;
    esac
done < "$CONFIG_FILE"

# --- 🔒 强制校验 DEPLOY_SCOPE ---
case "$DEPLOY_SCOPE" in
    all|backend|frontend) ;;
    *)
        echo "❌ 错误: DEPLOY_SCOPE 必须是 all/backend/frontend，当前值='$DEPLOY_SCOPE'" >&2
        exit 1
        ;;
esac

# --- ✅ 生成日志文件名 ---
LOG_FILE="$LOG_DIR/deploy_${TODAY}_${DEPLOY_SCOPE}_${TIME_NOW}.log"

# --- 🛡️ 安全检查：确保 LOG_FILE 可写 ---
if ! touch "$LOG_FILE".tmp 2>/dev/null; then
    echo "❌ 错误: 无法写入日志文件 $LOG_FILE，请检查目录权限！" >&2
    exit 1
fi
rm -f "$LOG_FILE".tmp

# --- 📝 日志函数：写入带时间戳的日志 ---
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# --- 🎨 彩色控制台输出 ---
console_log() {
    echo -e "$1"
}

# --- 🕰️ 设置定时任务（每天 5:00 执行） ---
CRON_JOB="0 5 * * * /bin/bash /home/build/auto-deploy.sh run"

if crontab -l 2>/dev/null | grep -Fxq "$CRON_JOB"; then
    log "定时任务已存在，无需重复写入。"
else
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    log "已将定时任务写入 crontab：$CRON_JOB"
fi

# --- 🚪 如果没有 run 参数，只写定时任务 ---
if [ "${1:-}" != "run" ]; then
    log "首次执行，仅写入定时任务，不立刻运行部署。"
    exit 0
fi

# -------------------------
# 开始部署逻辑
# -------------------------
log "======== 部署任务启动 ========"

LOCK_FILE="/home/build/.auto-deploy.lock"

# 检查锁文件并判断原进程是否仍在运行
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || true)
    if [[ -n "$LOCK_PID" ]] && kill -0 "$LOCK_PID" 2>/dev/null; then
        log "检测到正在运行的部署进程 (PID: $LOCK_PID)，退出以避免冲突。"
        exit 1
    else
        log "发现过期锁文件（PID $LOCK_PID 已不存在），清除并继续。"
        rm -f "$LOCK_FILE"
    fi
fi

# 创建锁文件
echo "$$" > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"; log "部署任务结束。"' EXIT

START_TIME=$(date +%s)

# -------------------------
# 配置校验与环境设置
# -------------------------
log "加载配置文件: $CONFIG_FILE"
log "配置参数: RUN_DEPLOY=$RUN_DEPLOY, DEPLOY_ENV=$DEPLOY_ENV, DEPLOY_SCOPE=$DEPLOY_SCOPE"

if [ "$RUN_DEPLOY" != "true" ]; then
    log "配置中设置了 RUN_DEPLOY=false，今天不执行部署，退出。"
    exit 0
fi

# 设置后端命令（使用数组安全执行）
case "${DEPLOY_ENV:-dev}" in
    dev)
        BACKEND_CMD=(./deploy-project.sh -d -p -b)
        ENV_NAME="测试服务器"
        ;;
    prod)
        BACKEND_CMD=(./deploy-project.sh -p -b)
        ENV_NAME="正式服务器"
        ;;
    *)
        log "错误: DEPLOY_ENV 必须是 'dev' 或 'prod'，当前值=$DEPLOY_ENV"
        exit 1
        ;;
esac

log "目标环境: $ENV_NAME"
log "后端部署命令: ${BACKEND_CMD[*]}"

# -------------------------
# 初始化部署结果变量（关键！）
# -------------------------
BACKEND_EXIT=0
FRONTEND_EXIT=0

# -------------------------
# 后端部署（如果需要）
# -------------------------
if [ "$DEPLOY_SCOPE" = "all" ] || [ "$DEPLOY_SCOPE" = "backend" ]; then
    if [ ! -d "/home/build/ruo-shan-cloud" ]; then
        log "错误: 找不到后端项目目录 /home/build/ruo-shan-cloud"
        BACKEND_EXIT=1
    else
        cd /home/build/ruo-shan-cloud || {
            log "错误: 无法进入后端目录 /home/build/ruo-shan-cloud"
            BACKEND_EXIT=1
        }

        if [ $BACKEND_EXIT -eq 0 ]; then
            log "进入后端目录: $(pwd)"

            console_log "\033[1;34m────────────────────────────────────────────────────────────────────────────────\033[0m"
            console_log "\033[1;36m✅ 开始执行后端部署\033[0m"
            log "开始执行后端部署"
            console_log "\033[1;33m命令: '${BACKEND_CMD[*]}'\033[0m"
            log "执行命令: ${BACKEND_CMD[*]}"
            console_log "\033[1;32m⏳ 提示：Maven 构建可能需要 2-5 分钟，请耐心等待...\033[0m"
            console_log "\033[1;35m📝 实时日志已同步记录到: $LOG_FILE\033[0m"
            console_log "\033[1;34m────────────────────────────────────────────────────────────────────────────────\033[0m"

            # 判断脚本是否存在并选择执行方式
            if [ -x "${BACKEND_CMD[0]}" ]; then
                cmd=("${BACKEND_CMD[@]}")
            elif [ -f "${BACKEND_CMD[0]}" ]; then
                log "注意: 后端部署脚本存在但不可执行，改用 'bash' 运行。"
                cmd=(bash "${BACKEND_CMD[@]}")
            else
                log "错误: 后端部署脚本 ${BACKEND_CMD[0]} 不存在"
                BACKEND_EXIT=1
            fi

            if [ $BACKEND_EXIT -eq 0 ]; then
                "${cmd[@]}" 2>&1 | tee -a "$LOG_FILE"
                BACKEND_EXIT=${PIPESTATUS[0]}
            fi

            if [ $BACKEND_EXIT -ne 0 ]; then
                log "后端部署失败 ❌"
            else
                log "后端部署成功 ✅"
            fi
        fi
    fi
fi

# -------------------------
# 前端部署（如果需要）
# -------------------------
if [ "$DEPLOY_SCOPE" = "all" ] || [ "$DEPLOY_SCOPE" = "frontend" ]; then
    if [ ! -d "/home/build/ruo-shan-cloud-admin" ]; then
        log "错误: 找不到前端项目目录 /home/build/ruo-shan-cloud-admin"
        FRONTEND_EXIT=1
    else
        cd /home/build/ruo-shan-cloud-admin || {
            log "错误: 无法进入前端目录 /home/build/ruo-shan-cloud-admin"
            FRONTEND_EXIT=1
        }

        if [ $FRONTEND_EXIT -eq 0 ]; then
            log "进入前端目录: $(pwd)"

            console_log "\033[1;34m────────────────────────────────────────────────────────────────────────────────\033[0m"
            console_log "\033[1;36m✅ 开始执行前端部署\033[0m"
            log "开始执行前端部署"
            console_log "\033[1;33m命令: ./copyweb.sh\033[0m"
            log "执行命令: ./copyweb.sh"
            console_log "\033[1;32m⏳ 提示：前端构建（vite build）可能需要 1-3 分钟...\033[0m"
            console_log "\033[1;35m📝 实时日志已同步记录到: $LOG_FILE\033[0m"
            console_log "\033[1;34m────────────────────────────────────────────────────────────────────────────────\033[0m"

            # 判断脚本是否存在并选择执行方式
            if [ -x "./copyweb.sh" ]; then
                cmd=(./copyweb.sh)
            elif [ -f "./copyweb.sh" ]; then
                log "注意: 前端部署脚本存在但不可执行，改用 'bash' 运行。"
                cmd=(bash ./copyweb.sh)
            else
                log "错误: 前端部署脚本 ./copyweb.sh 不存在"
                FRONTEND_EXIT=1
            fi

            if [ $FRONTEND_EXIT -eq 0 ]; then
                "${cmd[@]}" 2>&1 | tee -a "$LOG_FILE"
                FRONTEND_EXIT=${PIPESTATUS[0]}
            fi

            if [ $FRONTEND_EXIT -ne 0 ]; then
                log "前端部署失败 ❌"
            else
                log "前端部署成功 ✅"
            fi
        fi
    fi
fi

# -------------------------
# 部署完成，输出统计
# -------------------------
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
HOURS=$((DURATION / 3600))
MINUTES=$(((DURATION % 3600) / 60))
SECONDS=$((DURATION % 60))

log "======== 部署完成 ($ENV_NAME) ========"
log "部署总耗时: ${HOURS}h ${MINUTES}m ${SECONDS}s"

# 提示查看日志（控制台专属）
console_log "\033[1;35m📝 日志文件: $LOG_FILE\033[0m"
console_log "\033[1;33m💡 查看日志: /home/build/check-log.sh ${DEPLOY_SCOPE}\033[0m"
console_log ""  # 加个空行，提升可读性

# -------------------------
# 发送部署完成通知（增强版）
# -------------------------

# 情况1：全量部署（all）→ 发送统一通知
if [ "$DEPLOY_SCOPE" = "all" ]; then
    if [ $BACKEND_EXIT -eq 0 ] && [ $FRONTEND_EXIT -eq 0 ]; then
        /home/build/send-notify.sh \
            "全栈部署成功 ✅" \
            "🎉 后端 + 前端 部署全部完成\n环境: $ENV_NAME\n耗时: ${HOURS}h ${MINUTES}m ${SECONDS}s\n日志: \`$LOG_FILE\`" \
            "success"
    else
        ERROR_MSG="❌ 全栈部署失败\n"
        [ $BACKEND_EXIT -ne 0 ] && ERROR_MSG+="• 后端部署失败\n"
        [ $FRONTEND_EXIT -ne 0 ] && ERROR_MSG+="• 前端部署失败\n"
        ERROR_MSG+="日志: \`$LOG_FILE\`"

        /home/build/send-notify.sh \
            "全栈部署失败 ❌" \
            "$ERROR_MSG" \
            "error"
    fi

# 情况2：只部署后端
elif [ "$DEPLOY_SCOPE" = "backend" ]; then
    if [ $BACKEND_EXIT -eq 0 ]; then
        /home/build/send-notify.sh \
            "后端部署成功 🎉" \
            "环境: $ENV_NAME\n耗时: ${HOURS}h ${MINUTES}m ${SECONDS}s\n日志: \`$LOG_FILE\`" \
            "success"
    else
        /home/build/send-notify.sh \
            "后端部署失败 ❌" \
            "环境: $ENV_NAME\n日志: \`$LOG_FILE\`" \
            "error"
    fi

# 情况3：只部署前端
elif [ "$DEPLOY_SCOPE" = "frontend" ]; then
    if [ $FRONTEND_EXIT -eq 0 ]; then
        /home/build/send-notify.sh \
            "前端部署成功 🎉" \
            "环境: $ENV_NAME\n耗时: ${HOURS}h ${MINUTES}m ${SECONDS}s\n日志: \`$LOG_FILE\`" \
            "success"
    else
        /home/build/send-notify.sh \
            "前端部署失败 ❌" \
            "环境: $ENV_NAME\n日志: \`$LOG_FILE\`" \
            "error"
    fi
fi

# -------------------------
# 最终退出码
# -------------------------
if [ $BACKEND_EXIT -ne 0 ] || [ $FRONTEND_EXIT -ne 0 ]; then
    exit 1
else
    exit 0
fi
```

这段 Bash 脚本整体上写得非常**规范、清晰、健壮**，已经远超一般运维脚本的水平，具备了生产级自动化部署工具的基本素质。下面我从 **代码结构、安全性、健壮性、可维护性、可扩展性、潜在风险与改进建议** 等多个维度进行详细分析。

### ✅ 优点总结（亮点）

#### 1. **良好的结构设计**

- 模块化清晰：日志、配置加载、锁机制、部署逻辑、通知等分块明确。
- 使用函数封装日志输出（`log` 和 `console_log`），便于统一管理。
- 部署流程逻辑清晰，有顺序、有分支判断。


#### 2. **强健的错误处理和防护机制**

- `set -euo pipefail`：开启严格模式，防止未定义变量、命令失败忽略等问题。
- 对关键目录和文件做存在性检查（如日志目录、配置文件、项目目录）。
- 使用 `PIPESTATUS` 获取管道中命令的真实退出码，避免因 `tee` 导致误判。
- 锁文件机制防止并发执行，且会检测原进程是否存活，避免“死锁”。
- `trap` 清理锁文件，确保异常退出也能释放资源。


#### 3. **安全的配置加载方式**

- 没有直接 `source` 配置文件（避免注入风险），而是逐行解析 `key=value`，跳过注释和空行。
- 支持默认值 + 配置覆盖，提高了容错能力。
- 强制校验 `DEPLOY_SCOPE` 和 `DEPLOY_ENV` 的合法值，防止非法输入。


#### 4. **完善的日志系统**

- 日志带时间戳，格式统一。
- 实时输出到控制台并写入文件（通过 `tee`）。
- 日志路径可追溯，命名包含时间、作用域、毫秒级时间戳。
- 提示用户如何查看日志（`check-log.sh`）。


#### 5. **用户友好的交互体验**

- 使用 ANSI 颜色输出，关键信息高亮（蓝色分隔线、绿色成功、红色失败）。
- 给出构建耗时预估提示（如 Maven 构建 2-5 分钟），提升等待体验。
- 控制台提示查看日志的方式，降低使用门槛。


#### 6. **自动化调度支持**

- 自动写入 crontab，实现定时部署。
- 首次运行只写定时任务，避免立即执行造成混乱。
- 判断任务是否已存在，避免重复添加。


#### 7. **灵活的部署策略**

- 支持 `all` / `backend` / `frontend` 多种部署范围。
- 支持 `dev` / `prod` 环境切换，命令不同。
- 可通过配置控制是否执行（`RUN_DEPLOY=false` 则跳过）。


#### 8. **通知机制完善**

- 根据不同部署范围和结果发送不同通知内容。
- 成功/失败消息区分明确，包含环境、耗时、日志路径。
- 支持结构化通知（标题、内容、类型），方便集成企业微信/钉钉等。


### ⚠️ 潜在问题与改进建议

尽管脚本已经很优秀，但仍有一些可以优化的地方：

#### 🔧 1. **`cmd`** **数组覆盖问题（潜在 bug）**

```Bash showLineNumbers=true
if [ -x "${BACKEND_CMD[0]}" ]; then
    cmd=("${BACKEND_CMD[@]}")
elif [ -f "${BACKEND_CMD[0]}" ]; then
    log "注意: 后端部署脚本存在但不可执行，改用 'bash' 运行。"
    cmd=(bash "${BACKEND_CMD[@]}")
else
    log "错误: 后端部署脚本 ${BACKEND_CMD[0]} 不存在"
    BACKEND_EXIT=1
fi
```

#### ❌ 问题：

`BACKEND_CMD` 是一个数组（如 `(./deploy-project.sh -d -p -b)`），当用 `bash "${BACKEND_CMD[@]}"` 执行时，**第一个参数 **`./deploy-project.sh`** 会被当作脚本名传给 bash，其余参数正确传递** —— 这是正确的。

但注意：`BACKEND_CMD[0]` 是 `./deploy-project.sh`，而 `BACKEND_CMD[1..n]` 是参数。上面写法没问题。

✅ **结论：此处逻辑是正确的，无需修改。**

> ✅ 建议加个注释说明：“使用 bash 执行非可执行脚本，保留原参数”。

#### 🔧 2. **`cd`** **后未返回原路径（影响后续操作）**

```Bash showLineNumbers=true
cd /home/build/ruo-shan-cloud || { ... }
```

如果后续还要访问其他路径（虽然目前没有），当前工作目录已变，可能影响判断。

✅ 建议：使用子 shell 执行 `cd`，避免污染主进程环境

```Bash showLineNumbers=true
(
    cd /home/build/ruo-shan-cloud || {
        log "无法进入后端目录"
        exit 1
    }
    # 在子 shell 中执行部署命令
    "${cmd[@]}" 2>&1 | tee -a "$LOG_FILE"
) 
BACKEND_EXIT=${PIPESTATUS[0]}
```

> ⚠️ 注意：这样就不能用 `PIPESTATUS` 了，因为子 shell 结束后父 shell 拿不到它的 `PIPESTATUS`。

更优解：使用 `pushd/popd`

```Bash showLineNumbers=true
pushd /home/build/ruo-shan-cloud > /dev/null || {
    log "无法进入后端目录"
    FRONTEND_EXIT=1
    continue
}
# 执行命令
"${cmd[@]}" 2>&1 | tee -a "$LOG_FILE"
FRONTEND_EXIT=${PIPESTATUS[0]}
popd > /dev/null
```

✅ 推荐使用 `pushd/popd` 来保证路径切换安全。

#### 🔧 3. **日志文件名中时间精度不足**

```Bash showLineNumbers=true
TIME_NOW=$(date +"%H%M%S")
```

如果一天内多次部署，有可能出现日志文件名冲突（尤其在 CI/CD 高频场景）。

✅ 建议：增加毫秒或纳秒级时间戳

```Bash showLineNumbers=true
TIME_NOW=$(date +"%H%M%S%3N")  # 毫秒
# 或
TIME_NOW=$(date +"%s%3N")      # 时间戳+毫秒
```

或者直接用 `$$`（PID）防重：

```Bash showLineNumbers=true
LOG_FILE="$LOG_DIR/deploy_${TODAY}_${DEPLOY_SCOPE}_${TIME_NOW}_$$"
```

#### 🔧 4. **`send-notify.sh`** **路径硬编码，缺乏健壮性**

```Bash showLineNumbers=true
/home/build/send-notify.sh
```

如果脚本被移动或路径变更，通知会失败。

✅ 建议：定义变量或检查是否存在

```Bash showLineNumbers=true
NOTIFY_SCRIPT="/home/build/send-notify.sh"
if [ ! -x "$NOTIFY_SCRIPT" ]; then
    log "警告: 通知脚本不存在或不可执行: $NOTIFY_SCRIPT"
else
    "$NOTIFY_SCRIPT" "标题" "内容" "type"
fi
```

#### 🔧 5. **缺少部署前的 Git 拉取或代码更新逻辑**

当前脚本假设代码已存在且最新，但实际部署前应确保拉取最新代码。

✅ 建议增加：

```Bash showLineNumbers=true
# 在 cd 后添加
git fetch --all
git reset --hard origin/main  # 或其他分支
git clean -fdx
```

⚠️ 注意：这需要确认分支策略、是否允许强制覆盖。

#### 🔧 6. **缺少前置检查：依赖是否安装？**

比如：

- Maven 是否存在？
- Node.js / npm / pnpm 是否存在？
- Java 版本是否满足？


✅ 建议添加环境检查函数

```Bash showLineNumbers=true
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log "错误: 缺少必要命令 '$1'"
        exit 1
    fi
}

check_command mvn
check_command node
check_command npm
```

#### 🔧 7. **`crontab`** **写入方式不够安全**

```Bash showLineNumbers=true
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
```

这种方式可能引入重复任务（虽然用了 `grep` 判断，但存在竞态条件）。

✅ 更安全做法：使用临时文件 + 去重

```Bash showLineNumbers=true
temp_crontab=$(mktemp)
(crontab -l 2>/dev/null | grep -v "auto-deploy.sh"; echo "$CRON_JOB") > "$temp_crontab"
crontab "$temp_crontab"
rm -f "$temp_crontab"
```

#### 🔧 8. **缺少部署结果归档或软链最新日志**

建议创建一个软链指向最新的日志：

```Bash showLineNumbers=true
ln -sf "$(basename "$LOG_FILE")" "$LOG_DIR/latest_${DEPLOY_SCOPE}.log"
```

方便快速查看最近一次日志。

#### 🔧 9. **`DEPLOY_ENV`** **默认值应从变量取**

```Bash showLineNumbers=true
case "${DEPLOY_ENV:-dev}" in
```

✅ 正确！你已经做了默认值处理，很好。

#### 🔧 10. **`console_log`** **输出未重定向，可能干扰日志解析**

虽然不影响功能，但如果有人用脚本解析日志，彩色字符（`\033[...`）会造成干扰。

✅ 建议：根据是否是终端决定是否启用颜色

```Bash showLineNumbers=true
if [ -t 1 ]; then
    USE_COLOR=true
else
    USE_COLOR=false
fi

console_log() {
    if [ "$USE_COLOR" = true ]; then
        echo -e "$1"
    else
        echo -e "$1" | sed 's/\x1b\[[0-9;]*m//g'  # 去除 ANSI 颜色
    fi
}
```

#### ✅ 总结评分（满分10分）

| 维度           | 评分        | 说明                         |
| -------------- | ----------- | ---------------------------- |
| **结构清晰度** | ⭐⭐⭐⭐⭐ 10/10 | 模块分明，逻辑流畅           |
| **错误处理**   | ⭐⭐⭐⭐⭐ 9/10  | 几乎全覆盖，仅缺路径恢复     |
| **安全性**     | ⭐⭐⭐⭐☆ 9/10  | 避免 `source`，权限检查到位  |
| **可维护性**   | ⭐⭐⭐⭐☆ 8/10  | 可读性强，稍加注释更佳       |
| **可扩展性**   | ⭐⭐⭐⭐☆ 8/10  | 支持多环境/多范围，易于扩展  |
| **用户体验**   | ⭐⭐⭐⭐⭐ 10/10 | 彩色提示、预估时间、日志指引 |
| **健壮性**     | ⭐⭐⭐⭐☆ 9/10  | 考虑并发、锁、权限、注入等   |

> **综合评分：9.2 / 10**

#### ✅ 最终建议（行动清单）

1. ✅ 使用 `pushd/popd` 替代 `cd`，确保路径安全。
2. ✅ 日志文件名加入 PID 或毫秒，避免冲突。
3. ✅ 检查 `send-notify.sh` 是否存在且可执行。
4. ✅ 添加 `check_command` 检查关键依赖（mvn、node 等）。
5. ✅ 添加 Git 拉取最新代码逻辑（可配置是否开启）。
6. ✅ 创建 `latest.log` 软链方便查看。
7. ✅ 优化 crontab 写入方式，避免重复。
8. ✅ （可选）根据终端判断是否启用颜色输出。
   1. 

### 🎉 结论

这是一段**高质量、生产可用的自动化部署脚本**，远超大多数团队的运维脚本水平。稍作优化后，完全可以作为 CI/CD 流水线中的“手动触发部署”或“定时部署”核心组件。

## 三、deploy-config.conf 配置文件

```Shell showLineNumbers=true
# 是否执行部署, 默认正常5点定时执行 (true/false)
RUN_DEPLOY=true

# 部署环境，默认测试服务器 (dev=测试服务器 / prod=正式服务器)
DEPLOY_ENV=dev

# 部署范围:
#   all   = 部署后端 + 前端
#   backend = 只部署后端 (deploy-project.sh)
#   frontend = 只部署前端 (copyweb.sh)
DEPLOY_SCOPE=backend
```

## 四、check-log.sh 查看日志脚本

```Bash showLineNumbers=true
#!/bin/bash
# 日志管理工具 check-log.sh
# 功能：交互式查看、删除、清理部署日志

LOG_DIR="/home/build/deploy-logs"
mkdir -p "$LOG_DIR"   # 确保日志目录存在

while true; do
    clear
    echo "============================"
    echo "     部署日志管理工具"
    echo "  日志目录: $LOG_DIR"
    echo "============================"
    echo "1) 列出所有日志文件"
    echo "2) 查看最新日志"
    echo "3) 选择日志文件查看"
    echo "4) 删除指定日志文件"
    echo "5) 清空所有日志"
    echo "6) 退出"
    echo "============================"
    read -p "请选择操作 [1-6]: " choice

    case $choice in
        1)
            echo "[日志文件列表]"
            if [ "$(ls -A $LOG_DIR)" ]; then
                ls -lh "$LOG_DIR"
            else
                echo "日志目录为空。"
            fi
            read -p "按回车键返回菜单..."
            ;;
        2)
            latest_log=$(ls -t "$LOG_DIR" 2>/dev/null | head -n 1)
            if [ -z "$latest_log" ]; then
                echo "没有找到日志文件。"
                read -p "按回车键返回菜单..."
            else
                echo "正在查看最新日志: $latest_log"
                echo "--------------------------------"
                echo "[提示] less 使用说明：空格翻页，b 上翻，/搜索，n 下一个，q 退出"
                read -p "按回车开始查看..."
                less "$LOG_DIR/$latest_log"
            fi
            ;;
        3)
            echo "[选择日志文件查看]"
            logs=("$LOG_DIR"/*)
            if [ ! -e "${logs[0]}" ]; then
                echo "没有日志文件。"
                read -p "按回车键返回菜单..."
                continue
            fi
            echo "0) 返回菜单"
            select logfile in "${logs[@]}"; do
                if [ "$REPLY" == "0" ]; then
                    break
                elif [ -n "$logfile" ] && [ -f "$logfile" ]; then
                    echo "[提示] less 使用说明：空格翻页，b 上翻，/搜索，n 下一个，q 退出"
                    read -p "按回车开始查看..."
                    less "$logfile"
                    break
                else
                    echo "无效选择，请重试。"
                fi
            done
            ;;
        4)
            echo "[选择日志文件删除]"
            logs=("$LOG_DIR"/*)
            if [ ! -e "${logs[0]}" ]; then
                echo "没有日志文件。"
                read -p "按回车键返回菜单..."
                continue
            fi
            echo "0) 返回菜单"
            select logfile in "${logs[@]}"; do
                if [ "$REPLY" == "0" ]; then
                    break
                elif [ -n "$logfile" ] && [ -f "$logfile" ]; then
                    read -p "确定要删除 $logfile 吗？(y/n): " confirm
                    if [[ $confirm == "y" ]]; then
                        rm -f "$logfile"
                        echo "已删除 $logfile"
                    else
                        echo "操作取消"
                    fi
                    read -p "按回车键返回菜单..."
                    break
                else
                    echo "无效选择，请重试。"
                fi
            done
            ;;
        5)
            read -p "确定要清空所有日志吗？(y/n): " confirm
            if [[ $confirm == "y" ]]; then
                rm -f "$LOG_DIR"/*
                echo "所有日志已清空。"
            else
                echo "操作取消。"
            fi
            sleep 2
            ;;
        6)
            echo "退出日志管理工具。"
            exit 0
            ;;
        *)
            echo "无效选项，请输入 1-6。"
            sleep 2
            ;;
    esac
done
```

## 五、send-notify.sh 钉钉通知脚本

```Bash showLineNumbers=true
#!/usr/bin/env bash

# ========================
# 钉钉通知脚本（自动部署专用）
# ========================

# 🔐 钉钉机器人 Webhook（请勿泄露）
WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=XXXXXXSX"

# 参数
TITLE="${1:-部署通知}"
CONTENT="${2:-状态未知}"
STATUS="${3:-info}"

# 设置图标
case "$STATUS" in
    success)
        ICON="✅"
        ;;
    error)
        ICON="❌"
        ;;
    *)
        ICON="ℹ️"
        ;;
esac

# 构造 JSON（关键：添加关键词 + 正确转义）
PAYLOAD="{
  \"msgtype\": \"markdown\",
  \"markdown\": {
    \"title\": \"$TITLE\",
    \"text\": \"关键词\n\n$ICON $TITLE\\n\\n> $CONTENT\"
  },
  \"at\": {
    \"isAtAll\": false
  }
}"

# 发送请求（忽略错误，避免影响主流程）
curl -s -X POST \
     -H "Content-Type: application/json" \
     -d "$PAYLOAD" \
     "$WEBHOOK_URL" >/dev/null 2>&1 || true
```