# Makefile for the Playwright simulation project

# Prevents make from confusing targets with file names.
.PHONY: all install check-deps run dashboard clean help

# Default target, shows help.
all: help

# Installs all system and project dependencies.
install: check-deps
	@echo "--> Installing project dependencies from package.json..."
	@npm install
	@echo "--> Installing Playwright browsers..."
	@npx playwright install
	@echo "✅ Installation complete."


# Checks if system tools (brew, node) are available.
check-deps:
	@command -v brew >/dev/null 2>&1 || (echo "🚨 Homebrew not found. Please install it from https://brew.sh"; exit 1)
	@command -v node >/dev/null 2>&1 || (echo "Node.js not found. Attempting to install with Homebrew..."; brew install node)

# Runs the simulation in the default mode (file log).
run: install
	@echo "🚀 Starting simulation (file mode)..."
	@node simular-usuarios.js

# Runs the simulation in interactive dashboard mode.
dashboard: install
	@echo "📊 Starting simulation (dashboard mode)..."
	@OUTPUT_MODE=dashboard node simular-usuarios.js

# Cleans up generated artifacts.
clean:
	@echo "🧹 Cleaning the project..."
	@rm -rf node_modules
	@rm -f log-saida.txt

# Shows available commands.
help:
	@echo "Available commands:"
	@echo "  make install    - Installs all dependencies."
	@echo "  make run        - Runs the simulation and saves the log to a file."
	@echo "  make dashboard  - Runs the simulation with an interactive terminal dashboard."
	@echo "  make clean      - Removes generated files and dependencies."