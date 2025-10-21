.PHONY: install build dev test lint docker-up docker-down logs

install:
	@echo "Installing backend and frontend dependencies..."
	cd secureScan_Back && cargo fetch
	cd secureScan_Front && npm ci

build: build-backend build-frontend

build-backend:
	cd secureScan_Back && cargo build --release

build-frontend:
	cd secureScan_Front && npm run build

dev:
	@echo "Starting backend and frontend dev servers"
	start cmd /k "cd secureScan_Back && cargo run"
	start cmd /k "cd secureScan_Front && npm run dev -- --host"

test:
	cd secureScan_Back && cargo test

lint:
	@echo "Run clippy and eslint if configured"
	cd secureScan_Back && cargo clippy -- -D warnings || true
	cd secureScan_Front && npx eslint . || true

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

logs:
	docker compose logs -f
