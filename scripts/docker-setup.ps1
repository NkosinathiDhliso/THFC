# THFCScan Docker Setup Script for Windows
# This script sets up the complete Docker environment for THFCScan

Write-Host "Setting up THFCScan Docker Environment" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    docker-compose --version | Out-Null
    Write-Host "Docker is installed and running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or not running. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Stop any existing containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Remove old images (optional - uncomment if you want to rebuild everything)
# Write-Host "Removing old images..." -ForegroundColor Yellow
# docker-compose down --rmi all --volumes

# Build and start services
Write-Host "Building and starting THFCScan services..." -ForegroundColor Yellow
docker-compose up --build -d

# Wait for services to be healthy
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "Checking service health..." -ForegroundColor Yellow
$services = @("thfcscan-app", "supabase-db", "supabase-kong", "supabase-auth", "supabase-rest")

foreach ($service in $services) {
    $status = docker-compose ps $service --format "table {{.Service}}\t{{.Status}}"
    Write-Host "$service status: $status" -ForegroundColor Cyan
}

# Run database migrations
Write-Host "Running database migrations..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# The migrations should auto-run via the init scripts, but let's verify
docker-compose exec -T supabase-db psql -U postgres -d postgres -c "\dt" | Out-Host

Write-Host "THFCScan Docker environment is ready!" -ForegroundColor Green
Write-Host "Application URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Database URL: postgres://postgres:your-super-secret-jwt-token-with-at-least-32-characters-long@localhost:54322/postgres" -ForegroundColor Cyan
Write-Host "API Gateway: http://localhost:8000" -ForegroundColor Cyan

Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Yellow
Write-Host "To stop: docker-compose down" -ForegroundColor Yellow
