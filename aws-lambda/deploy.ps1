# THFCScan AWS Lambda Deployment Script
# This script automates the deployment of Lambda functions to AWS

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$FunctionName = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SetupOnly = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "\n🔄 $Message" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-AWSCredentials {
    try {
        $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
        if ($identity.Account) {
            Write-Success "AWS credentials configured for account: $($identity.Account)"
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

function Install-Dependencies {
    Write-Step "Installing dependencies..."
    
    if (!(Test-Path "package.json")) {
        Write-Error "package.json not found. Please run this script from the aws-lambda directory."
        exit 1
    }
    
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    
    Write-Success "Dependencies installed successfully"
}

function Build-Project {
    if ($SkipBuild) {
        Write-Warning "Skipping build step"
        return
    }
    
    Write-Step "Building TypeScript project..."
    
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    
    Write-Success "Build completed successfully"
}

function Run-Tests {
    if ($SkipTests) {
        Write-Warning "Skipping tests"
        return
    }
    
    Write-Step "Running tests..."
    
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tests failed"
        exit 1
    }
    
    Write-Success "All tests passed"
}

function Setup-AWSResources {
    Write-Step "Setting up AWS resources..."
    
    # Check if S3 bucket exists
    $bucketName = "thfcscan-storage-$Environment"
    $bucketExists = aws s3api head-bucket --bucket $bucketName 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Step "Creating S3 bucket: $bucketName"
        aws s3api create-bucket --bucket $bucketName --region us-east-1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "S3 bucket created: $bucketName"
            
            # Set bucket CORS configuration
            $corsConfig = @'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
'@
            $corsConfig | Out-File -FilePath "cors-config.json" -Encoding UTF8
            aws s3api put-bucket-cors --bucket $bucketName --cors-configuration file://cors-config.json
            Remove-Item "cors-config.json"
            
            Write-Success "CORS configuration applied to S3 bucket"
        } else {
            Write-Error "Failed to create S3 bucket"
            exit 1
        }
    } else {
        Write-Success "S3 bucket already exists: $bucketName"
    }
    
    # Verify SES email addresses
    Write-Step "Verifying SES email addresses..."
    
    $emails = @("noreply@thfcscan.com", "admin@thfcscan.com", "support@thfcscan.com")
    
    foreach ($email in $emails) {
        $verification = aws ses get-identity-verification-attributes --identities $email --output json 2>$null
        if ($LASTEXITCODE -eq 0) {
            $status = ($verification | ConvertFrom-Json).VerificationAttributes.$email.VerificationStatus
            if ($status -eq "Success") {
                Write-Success "Email verified: $email"
            } else {
                Write-Warning "Email not verified: $email (Status: $status)"
                Write-ColorOutput "  Run: aws ses verify-email-identity --email-address $email" $Yellow
            }
        } else {
            Write-Warning "Could not check verification status for: $email"
        }
    }
}

function Deploy-Functions {
    Write-Step "Deploying Lambda functions to $Environment..."
    
    $deployCommand = "serverless deploy --stage $Environment"
    
    if ($FunctionName) {
        $deployCommand += " --function $FunctionName"
        Write-ColorOutput "Deploying specific function: $FunctionName" $Blue
    } else {
        Write-ColorOutput "Deploying all functions" $Blue
    }
    
    if ($VerboseOutput) {
        $deployCommand += " --verbose"
    }
    
    Invoke-Expression $deployCommand
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Deployment failed"
        exit 1
    }
    
    Write-Success "Deployment completed successfully"
}

function Show-DeploymentInfo {
    Write-Step "Getting deployment information..."
    
    serverless info --stage $Environment
    
    Write-ColorOutput "\n📋 Deployment Summary:" $Blue
    Write-ColorOutput "  Environment: $Environment" $Green
    Write-ColorOutput "  Region: us-east-1" $Green
    Write-ColorOutput "  S3 Bucket: thfcscan-storage-$Environment" $Green
    
    if ($FunctionName) {
        Write-ColorOutput "  Function: $FunctionName" $Green
    } else {
        Write-ColorOutput "  Functions: All deployed" $Green
    }
    
    Write-ColorOutput "\n🔗 Next Steps:" $Yellow
    Write-ColorOutput "  1. Test the deployed functions" $Yellow
    Write-ColorOutput "  2. Update frontend API endpoints if needed" $Yellow
    Write-ColorOutput "  3. Monitor CloudWatch logs for any issues" $Yellow
    Write-ColorOutput "  4. Update DNS/CDN configuration if this is production" $Yellow
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check Node.js
    if (!(Test-Command "node")) {
        Write-Error "Node.js is not installed or not in PATH"
        exit 1
    }
    
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
    
    # Check npm
    if (!(Test-Command "npm")) {
        Write-Error "npm is not installed or not in PATH"
        exit 1
    }
    
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
    
    # Check AWS CLI
    if (!(Test-Command "aws")) {
        Write-Error "AWS CLI is not installed or not in PATH"
        Write-ColorOutput "Please install AWS CLI: https://aws.amazon.com/cli/" $Yellow
        exit 1
    }
    
    $awsVersion = aws --version
    Write-Success "AWS CLI: $awsVersion"
    
    # Check AWS credentials
    if (!(Test-AWSCredentials)) {
        Write-Error "AWS credentials not configured"
        Write-ColorOutput "Please run: aws configure" $Yellow
        exit 1
    }
    
    # Check Serverless Framework
    if (!(Test-Command "serverless")) {
        Write-Error "Serverless Framework is not installed"
        Write-ColorOutput "Please install: npm install -g serverless" $Yellow
        exit 1
    }
    
    $slsVersion = serverless --version
    Write-Success "Serverless Framework: $slsVersion"
    
    Write-Success "All prerequisites met"
}

function Main {
    Write-ColorOutput "\n🚀 THFCScan AWS Lambda Deployment" $Blue
    Write-ColorOutput "Environment: $Environment" $Green
    
    if ($FunctionName) {
        Write-ColorOutput "Function: $FunctionName" $Green
    }
    
    Write-ColorOutput "" # Empty line
    
    try {
        # Check prerequisites
        Test-Prerequisites
        
        # Install dependencies
        Install-Dependencies
        
        # Build project
        Build-Project
        
        # Run tests
        Run-Tests
        
        # Setup AWS resources
        Setup-AWSResources
        
        if ($SetupOnly) {
            Write-Success "Setup completed. Skipping deployment as requested."
            return
        }
        
        # Deploy functions
        Deploy-Functions
        
        # Show deployment info
        Show-DeploymentInfo
        
        Write-ColorOutput "\n🎉 Deployment completed successfully!" $Green
        
    }
    catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        exit 1
    }
}

# Script help
if ($args -contains "-h" -or $args -contains "--help") {
    Write-ColorOutput "\nTHFCScan AWS Lambda Deployment Script" $Blue
    Write-ColorOutput "\nUsage:" $Green
    Write-ColorOutput "  .\deploy.ps1 [options]" $Yellow
    Write-ColorOutput "\nOptions:" $Green
    Write-ColorOutput "  -Environment <dev|staging|prod>  Target environment (default: dev)" $Yellow
    Write-ColorOutput "  -FunctionName <name>             Deploy specific function only" $Yellow
    Write-ColorOutput "  -SkipTests                       Skip running tests" $Yellow
    Write-ColorOutput "  -SkipBuild                       Skip TypeScript build" $Yellow
    Write-ColorOutput "  -SetupOnly                       Only setup AWS resources, skip deployment" $Yellow
    Write-ColorOutput "  -VerboseOutput                   Enable verbose output" $Yellow
    Write-ColorOutput "\nExamples:" $Green
    Write-ColorOutput "  .\deploy.ps1                                    # Deploy all functions to dev" $Yellow
    Write-ColorOutput "  .\deploy.ps1 -Environment prod                  # Deploy all functions to prod" $Yellow
    Write-ColorOutput "  .\deploy.ps1 -FunctionName processDonation      # Deploy specific function" $Yellow
    Write-ColorOutput "  .\deploy.ps1 -SetupOnly                         # Setup AWS resources only" $Yellow
    Write-ColorOutput "  .\deploy.ps1 -SkipTests -VerboseOutput          # Skip tests, verbose output" $Yellow
    Write-ColorOutput "" # Empty line
    exit 0
}

# Run main function
Main