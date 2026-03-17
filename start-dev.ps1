# Start Development Server with Environment Variables
Write-Host "🚀 Starting THFCScan Development Server..." -ForegroundColor Green

# Set environment variables for the current session
$env:VITE_SUPABASE_URL = "https://tqrlhajnkfcchgzsqpjd.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "your-anon-key-here"
$env:VITE_SUPABASE_SERVICE_KEY = "your-service-key-here"
$env:VITE_APP_URL = "http://localhost:5173"
$env:VITE_DEV_SERVER_URL = "http://localhost:5173"
$env:VITE_APP_ENV = "development"

Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host "📡 Supabase URL: $env:VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "🌐 App URL: $env:VITE_APP_URL" -ForegroundColor Cyan

# Start the development server
Write-Host "🔄 Starting Vite development server..." -ForegroundColor Yellow
npm run dev
