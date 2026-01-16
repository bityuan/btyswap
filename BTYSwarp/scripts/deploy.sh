#!/bin/bash

# PancakeSwap Interface 部署脚本
# 使用方法: ./scripts/deploy.sh [production|staging]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查部署环境..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查npm/yarn
    if command -v yarn &> /dev/null; then
        PACKAGE_MANAGER="yarn"
        log_info "使用 Yarn 作为包管理器"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
        log_info "使用 NPM 作为包管理器"
    else
        log_error "未找到包管理器 (npm 或 yarn)"
        exit 1
    fi
    
    # 检查构建目录
    if [ -d "build" ]; then
        log_warning "发现旧的构建目录，将删除..."
        rm -rf build
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install --frozen-lockfile
    else
        npm ci
    fi
    
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "开始构建项目..."
    
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn build:gzip
    else
        npm run build:gzip
    fi
    
    log_success "项目构建完成"
}

# 检查构建结果
check_build() {
    log_info "检查构建结果..."
    
    if [ ! -d "build" ]; then
        log_error "构建目录不存在"
        exit 1
    fi
    
    # 检查关键文件
    if [ ! -f "build/index.html" ]; then
        log_error "index.html 文件不存在"
        exit 1
    fi
    
    # 统计文件大小
    BUILD_SIZE=$(du -sh build | cut -f1)
    log_info "构建目录大小: $BUILD_SIZE"
    
    # 检查Gzip文件
    GZIP_COUNT=$(find build -name "*.gz" | wc -l)
    log_info "Gzip压缩文件数量: $GZIP_COUNT"
    
    log_success "构建检查完成"
}

# 部署到服务器（示例）
deploy_to_server() {
    local ENV=${1:-production}
    
    log_info "部署到 $ENV 环境..."
    
    # 这里需要根据实际情况配置
    # 示例：使用rsync部署到远程服务器
    # rsync -avz --delete build/ user@server:/var/www/pancake-swap-interface/
    
    log_warning "请根据实际情况配置部署逻辑"
    log_info "构建文件位于: $(pwd)/build"
    log_info "可以手动复制到服务器或配置自动部署"
}

# 显示部署信息
show_deployment_info() {
    log_success "部署准备完成！"
    echo ""
    echo "📁 构建目录: $(pwd)/build"
    echo "📦 包含Gzip压缩文件"
    echo ""
    echo "🚀 下一步操作:"
    echo "1. 将 build 目录复制到服务器"
    echo "2. 配置 nginx (参考 nginx.conf.example)"
    echo "3. 重启 nginx 服务"
    echo ""
    echo "📋 Nginx配置要点:"
    echo "- 启用 gzip_static on; 支持预压缩文件"
    echo "- 配置适当的缓存策略"
    echo "- 设置安全头"
    echo "- 处理React Router路由"
}

# 主函数
main() {
    local ENV=${1:-production}
    
    echo "🚀 PancakeSwap Interface 部署脚本"
    echo "环境: $ENV"
    echo ""
    
    check_environment
    install_dependencies
    build_project
    check_build
    deploy_to_server "$ENV"
    show_deployment_info
}

# 脚本入口
main "$@"
