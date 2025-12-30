# Makefile for GhostWebSurfer

# Use bash for shell commands
SHELL := /bin/bash

# Prevents make from confusing targets with file names.
.PHONY: all run dashboard clean help check_node install_node_mac install_node_linux docker-build docker-run docker-dashboard docker-clean

# Default target, shows help.
all: run

# --- OS Detection ---
# Detects the operating system (Linux or Darwin for macOS)
UNAME_S := $(shell uname -s)

# --- Dependency Management ---

# Target to check for Node.js and install if missing
check_node:
ifeq ($(shell command -v node >/dev/null 2>&1 && echo 1),)
	@echo "Node.js not found. Attempting to install..."
ifeq ($(UNAME_S),Darwin)
	$(MAKE) install_node_mac
else ifeq ($(UNAME_S),Linux)
	$(MAKE) install_node_linux
else
	@echo "Unsupported OS: $(UNAME_S). Please install Node.js (v16+) manually."
	@exit 1
endif
else
	@echo "Node.js is already installed."
endif

# Installs Node.js on macOS using Homebrew
install_node_mac:
	@echo "-> Detected macOS. Using Homebrew to install Node.js..."
	@if ! command -v brew >/dev/null 2>&1; then \
		echo "Error: Homebrew is not installed. Please install it from https://brew.sh/ and try again."; \
		exit 1; \
	fi
	brew install node

# Installs Node.js on Debian/Ubuntu Linux using apt-get
install_node_linux:
	@echo "-> Detected Linux. Using apt-get to install Node.js and npm..."
	@echo "   This may require sudo privileges."
	@if ! command -v apt-get >/dev/null 2>&1; then \
		echo "Warning: 'apt-get' not found. This script is optimized for Debian/Ubuntu."; \
		echo "Please install Node.js (v16+) manually using your package manager (e.g., yum, dnf)."; \
		exit 1; \
	fi
	sudo apt-get update && sudo apt-get install -y nodejs npm

# Installs all npm packages. The 'postinstall' script in package.json handles Playwright.
node_modules: check_node package.json
	npm install

# --- Main Targets ---

run: node_modules
	@node simulate-users.js

dashboard: node_modules
	@OUTPUT_MODE=dashboard node simulate-users.js

clean:
	@echo "🧹 Cleaning the project..."
	@rm -rf node_modules
	@rm -f output-log.txt

# --- Docker Targets ---

docker-build:
	@echo "🐳 Building Docker image..."
	@docker build -t ghostwebsurfer:latest .

docker-run: docker-build
	@echo "🚀 Running GhostWebSurfer in Docker..."
	@docker-compose up

docker-dashboard: docker-build
	@echo "📊 Running GhostWebSurfer Dashboard in Docker..."
	@docker-compose --profile dashboard up ghostwebsurfer-dashboard

docker-clean:
	@echo "🧹 Cleaning Docker resources..."
	@docker-compose down -v
	@docker rmi ghostwebsurfer:latest 2>/dev/null || true

help:
	@echo ""
	@echo "👻 GhostWebSurfer - Available Commands"
	@echo "======================================"
	@echo ""
	@echo "📦 LOCAL EXECUTION:"
	@echo "  make                    - Run simulation in file mode (default)"
	@echo "  make run                - Run simulation and save log to file"
	@echo "  make dashboard          - Run with interactive terminal dashboard"
	@echo "  make clean              - Remove node_modules and generated files"
	@echo ""
	@echo "🐳 DOCKER EXECUTION:"
	@echo "  make docker-build       - Build Docker image from Dockerfile"
	@echo "  make docker-run         - Build and run simulation in Docker (file mode)"
	@echo "  make docker-dashboard   - Build and run simulation in Docker (dashboard mode)"
	@echo "  make docker-clean       - Remove Docker containers, volumes and images"
	@echo ""
	@echo "🔧 MAINTENANCE:"
	@echo "  make check_node         - Check if Node.js is installed"
	@echo "  make help               - Show this help message"
	@echo ""
	@echo "📚 DOCUMENTATION:"
	@echo "  - README.md             - Main documentation"
	@echo "  - DOCKER.md             - Docker-specific guide"
	@echo "  - .env.example          - Environment variables template"
	@echo ""
	@echo "💡 EXAMPLES:"
	@echo "  TARGET_URL=https://example.com make run"
	@echo "  TOTAL_USERS=10 CONCURRENCY=5 make dashboard"
	@echo "  TARGET_URL=https://example.com make docker-run"
	@echo ""