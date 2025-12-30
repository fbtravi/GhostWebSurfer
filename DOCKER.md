# Docker Guide for GhostWebSurfer

## Quick Start

### Build the Image

```bash
docker build -t ghostwebsurfer:latest .
```

### Run with Docker Compose

```bash
# Run in file mode (default)
docker-compose up

# Run in dashboard mode
docker-compose --profile dashboard up ghostwebsurfer-dashboard

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Run with Docker CLI

```bash
# Basic run
docker run --rm \
  --security-opt seccomp=unconfined \
  --shm-size=2gb \
  -v $(pwd)/output:/app/output \
  ghostwebsurfer:latest

# Custom configuration
docker run --rm \
  --security-opt seccomp=unconfined \
  --shm-size=2gb \
  -e TARGET_URL=https://example.com \
  -e TOTAL_USERS=10 \
  -e CONCURRENCY=5 \
  -e WAIT_MS=3000 \
  -v $(pwd)/output:/app/output \
  ghostwebsurfer:latest

# Dashboard mode
docker run --rm -it \
  --security-opt seccomp=unconfined \
  --shm-size=2gb \
  -e OUTPUT_MODE=dashboard \
  -e TARGET_URL=https://example.com \
  ghostwebsurfer:latest
```

## Using the Helper Script

The `docker-run.sh` script simplifies running GhostWebSurfer with Docker:

```bash
# Make it executable (first time only)
chmod +x docker-run.sh

# Run with URL
./docker-run.sh -u https://example.com

# Run with multiple users
./docker-run.sh -u https://example.com -n 10 -c 5

# Dashboard mode
./docker-run.sh -d -u https://example.com

# Custom output directory
./docker-run.sh -u https://example.com -o ./my-results

# Full example
./docker-run.sh \
  --url https://example.com \
  --users 20 \
  --concurrency 5 \
  --output ./results

# View help
./docker-run.sh --help
```

## Environment Variables

All configuration can be done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TARGET_URL` | `https://google.com/` | URL to test |
| `TOTAL_USERS` | `5` | Number of users to simulate |
| `CONCURRENCY` | `5` | Max concurrent users |
| `WAIT_MS` | `2000` | Wait time after page load (ms) |
| `LOG_FILE` | `/app/output/output-log.txt` | Log file path |
| `PAGE_LOAD_TIMEOUT_MS` | `60000` | Page load timeout |
| `OUTPUT_MODE` | `file` | `file` or `dashboard` |

### Using .env File

```bash
# Copy the example file
cp .env.docker .env

# Edit with your settings
nano .env

# Run with docker-compose
docker-compose --env-file .env up
```

## Docker Compose Profiles

### Default Profile (File Mode)

```bash
docker-compose up
```

Runs simulation and saves results to `./output/output-log.txt`.

### Dashboard Profile

```bash
docker-compose --profile dashboard up ghostwebsurfer-dashboard
```

Runs interactive terminal dashboard. Press `q` to exit.

## Resource Limits

By default, containers are configured with:
- **CPU Limit**: 2 cores
- **Memory Limit**: 4GB
- **Memory Reservation**: 2GB
- **Shared Memory**: 2GB

Adjust these in `docker-compose.yml` if needed:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'      # Increase for more performance
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

## Troubleshooting

### Chromium Crashes

If Chromium crashes with errors like "Failed to launch chrome":

```bash
# Increase shared memory
docker run --shm-size=4gb ...

# Or use host IPC
docker run --ipc=host ...
```

### Permission Issues

If you see permission errors accessing the output directory:

```bash
# Create output directory with proper permissions
mkdir -p ./output
chmod 777 ./output
```

Or run container as your user:

```bash
docker run --user $(id -u):$(id -g) ...
```

### Container Exits Immediately

Check logs for errors:

```bash
# Docker Compose
docker-compose logs

# Docker CLI
docker logs <container-id>
```

Run interactively to see real-time output:

```bash
docker run --rm -it ghostwebsurfer:latest
```

### Slow Performance

1. **Reduce concurrency**: Lower `CONCURRENCY` value
2. **Increase resources**: Adjust CPU/memory limits
3. **Use faster storage**: Ensure Docker uses fast disk
4. **Disable analytics**: Set `EXCLUDE_RESOURCE_TYPES` appropriately

## CI/CD Integration

### GitHub Actions

See `.github/workflows/docker-build.yml.example` for a complete CI/CD workflow.

Basic example:

```yaml
- name: Run load test
  run: |
    docker build -t ghostwebsurfer:test .
    docker run --rm \
      --security-opt seccomp=unconfined \
      --shm-size=2gb \
      -e TARGET_URL=${{ secrets.TEST_URL }} \
      -e TOTAL_USERS=10 \
      -v $(pwd)/output:/app/output \
      ghostwebsurfer:test
    
- name: Upload results
  uses: actions/upload-artifact@v3
  with:
    name: load-test-results
    path: output/output-log.txt
```

### GitLab CI

```yaml
load-test:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t ghostwebsurfer:test .
    - docker run --rm
        --security-opt seccomp=unconfined
        --shm-size=2gb
        -e TARGET_URL=${TEST_URL}
        -e TOTAL_USERS=10
        -v $(pwd)/output:/app/output
        ghostwebsurfer:test
  artifacts:
    paths:
      - output/output-log.txt
    expire_in: 1 week
```

## Building for Production

### Optimization Tips

1. **Multi-stage builds** (already implemented)
2. **Layer caching**: Order Dockerfile to maximize cache hits
3. **Minimize image size**: Use `.dockerignore`

### Publishing to Registry

```bash
# Tag image
docker tag ghostwebsurfer:latest yourusername/ghostwebsurfer:latest
docker tag ghostwebsurfer:latest yourusername/ghostwebsurfer:v1.0.0

# Push to Docker Hub
docker push yourusername/ghostwebsurfer:latest
docker push yourusername/ghostwebsurfer:v1.0.0

# Pull and run
docker pull yourusername/ghostwebsurfer:latest
docker run --rm yourusername/ghostwebsurfer:latest
```

## Advanced Usage

### Running Multiple Tests in Parallel

```bash
# Run multiple targets simultaneously
docker-compose up --scale ghostwebsurfer=3
```

### Custom Browser Configuration

Mount a custom config file:

```bash
docker run --rm \
  -v $(pwd)/custom-config.js:/app/config.js \
  ghostwebsurfer:latest
```

### Debugging

Run with Node.js debug mode:

```bash
docker run --rm -it \
  -p 9229:9229 \
  --entrypoint node \
  ghostwebsurfer:latest \
  --inspect-brk=0.0.0.0:9229 simulate-users.js
```

### Network Throttling

Use Docker's built-in network throttling:

```bash
docker run --rm \
  --network slow-network \
  ghostwebsurfer:latest

# Create slow network
docker network create \
  --opt com.docker.network.bridge.enable_icc=false \
  slow-network
```

## Security Considerations

1. **Run as non-root**: Container runs as `pwuser` by default
2. **No privileged mode**: Uses `seccomp=unconfined` only for Chromium
3. **Read-only filesystem**: Consider adding `--read-only` flag
4. **Resource limits**: Prevents resource exhaustion

## Additional Resources

- [Playwright Docker Documentation](https://playwright.dev/docs/docker)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
