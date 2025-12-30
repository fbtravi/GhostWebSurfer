#!/bin/bash

# GhostWebSurfer Docker Run Script
# Quick script to run GhostWebSurfer in Docker with custom parameters

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
TARGET_URL="${TARGET_URL:-https://google.com/}"
TOTAL_USERS="${TOTAL_USERS:-5}"
CONCURRENCY="${CONCURRENCY:-5}"
OUTPUT_DIR="./output"

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Target URL to test (default: https://google.com/)"
    echo "  -n, --users NUM        Total number of users to simulate (default: 5)"
    echo "  -c, --concurrency NUM  Maximum concurrent users (default: 5)"
    echo "  -d, --dashboard        Run in dashboard mode (interactive)"
    echo "  -o, --output DIR       Output directory for logs (default: ./output)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -u https://example.com -n 10 -c 3"
    echo "  $0 --dashboard -u https://example.com"
    exit 1
}

# Parse arguments
DASHBOARD_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            TARGET_URL="$2"
            shift 2
            ;;
        -n|--users)
            TOTAL_USERS="$2"
            shift 2
            ;;
        -c|--concurrency)
            CONCURRENCY="$2"
            shift 2
            ;;
        -d|--dashboard)
            DASHBOARD_MODE=true
            shift
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${GREEN}🚀 Starting GhostWebSurfer in Docker...${NC}"
echo -e "${YELLOW}Configuration:${NC}"
echo "  URL: $TARGET_URL"
echo "  Users: $TOTAL_USERS"
echo "  Concurrency: $CONCURRENCY"
echo "  Output: $OUTPUT_DIR"

if [ "$DASHBOARD_MODE" = true ]; then
    echo -e "  Mode: ${GREEN}Dashboard (Interactive)${NC}"
    echo ""
    docker run --rm -it \
        --security-opt seccomp=unconfined \
        --shm-size=2gb \
        -e TARGET_URL="$TARGET_URL" \
        -e TOTAL_USERS="$TOTAL_USERS" \
        -e CONCURRENCY="$CONCURRENCY" \
        -e OUTPUT_MODE=dashboard \
        ghostwebsurfer:latest
else
    echo -e "  Mode: ${GREEN}File Output${NC}"
    echo ""
    docker run --rm \
        --security-opt seccomp=unconfined \
        --shm-size=2gb \
        -e TARGET_URL="$TARGET_URL" \
        -e TOTAL_USERS="$TOTAL_USERS" \
        -e CONCURRENCY="$CONCURRENCY" \
        -e OUTPUT_MODE=file \
        -v "$(pwd)/$OUTPUT_DIR:/app/output" \
        ghostwebsurfer:latest
    
    echo -e "${GREEN}✅ Simulation complete!${NC}"
    echo -e "Log file: ${YELLOW}$OUTPUT_DIR/output-log.txt${NC}"
fi
