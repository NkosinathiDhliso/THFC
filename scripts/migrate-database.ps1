# THFCScan Database Migration Script for Docker
# This script runs Supabase migrations in the Docker container

Write-Host "🗄️ THFCScan Database Migration" -ForegroundColor Cyan

# Check if Docker containers are running
Write-Host "📋 Checking Docker containers..." -ForegroundColor Yellow
$dbContainer = docker-compose ps supabase-db --format "{{.Status}}"
if ($dbContainer -notlike "*Up*") {
    Write-Host "❌ Database container is not running. Please run docker-setup.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database container is running" -ForegroundColor Green

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
$timeout = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $ready = docker-compose exec -T supabase-db pg_isready -U postgres 2>$null
    if ($ready -like "*accepting connections*") {
        Write-Host "✅ Database is ready" -ForegroundColor Green
        break
    }
    if ($elapsed -ge $timeout) {
        Write-Host "❌ Database did not become ready in time" -ForegroundColor Red
        exit 1
    }
} while ($true)

# Run the optimized migration
Write-Host "🚀 Running optimized THFCScan migration..." -ForegroundColor Yellow
$migrationFile = "supabase/migrations/20250823120000_optimized_thfcscan_complete.sql"

if (Test-Path $migrationFile) {
    Write-Host "📄 Applying migration: $migrationFile" -ForegroundColor Cyan
    
    # Copy migration file to container and execute
    docker cp $migrationFile "$(docker-compose ps -q supabase-db):/tmp/migration.sql"
    $result = docker-compose exec -T supabase-db psql -U postgres -d postgres -f /tmp/migration.sql
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Verify tables were created
Write-Host "🔍 Verifying tables were created..." -ForegroundColor Yellow
$tables = docker-compose exec -T supabase-db psql -U postgres -d postgres -c "\dt public.*" 2>$null
if ($tables -like "*donations*" -and $tables -like "*stores*" -and $tables -like "*profiles*") {
    Write-Host "✅ All THFCScan tables created successfully!" -ForegroundColor Green
    Write-Host "📊 Tables:" -ForegroundColor Cyan
    docker-compose exec -T supabase-db psql -U postgres -d postgres -c "\dt public.*"
} else {
    Write-Host "⚠️ Some tables may be missing. Check the output above." -ForegroundColor Yellow
    docker-compose exec -T supabase-db psql -U postgres -d postgres -c "\dt public.*"
}

# Show functions
Write-Host "🔧 Available functions:" -ForegroundColor Cyan
docker-compose exec -T supabase-db psql -U postgres -d postgres -c "\df public.*"

Write-Host "🎉 Database migration completed!" -ForegroundColor Green
Write-Host "📱 Your THFCScan application is ready at: http://localhost:3000" -ForegroundColor Cyan
