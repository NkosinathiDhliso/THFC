# AWS Amplify Setup Script for THFCScan
# This script helps set up AWS Amplify for CI/CD deployment

Write-Host "🚀 Setting up AWS Amplify for THFCScan..." -ForegroundColor Green

# Check if Node.js is installed
Write-Host "📋 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if npm is installed
Write-Host "📋 Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📦 Installing project dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Install Amplify CLI globally
Write-Host "🔧 Installing AWS Amplify CLI..." -ForegroundColor Yellow
npm install -g @aws-amplify/cli
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Amplify CLI" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Amplify CLI installed successfully" -ForegroundColor Green

# Test build
Write-Host "🏗️ Testing build process..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Tests failed, but continuing setup" -ForegroundColor Yellow
} else {
    Write-Host "✅ Tests passed" -ForegroundColor Green
}

Write-Host "`n🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure AWS credentials: amplify configure" -ForegroundColor White
Write-Host "2. Initialize Amplify project: amplify init" -ForegroundColor White
Write-Host "3. Add hosting: amplify add hosting" -ForegroundColor White
Write-Host "4. Deploy: amplify publish" -ForegroundColor White
Write-Host "`n📚 For more information, see AWS_AMPLIFY_DEPLOYMENT.md" -ForegroundColor Cyan
