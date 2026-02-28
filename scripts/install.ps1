# Cheerful — Windows PowerShell installer
# Usage: irm https://raw.githubusercontent.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely/main/scripts/install.ps1 | iex
#    or: irm ... | iex -ArgumentList "C:\path\to\install"

param([string]$InstallDir = "cheerful-the-buddy-of-cursor-agent-works-remotely")

$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/solarcell1475/cheerful-the-buddy-of-cursor-agent-works-remotely.git"
$Branch = if ($env:CHEERFUL_INSTALL_BRANCH) { $env:CHEERFUL_INSTALL_BRANCH } else { "main" }

Write-Host "Cheerful installer (branch: $Branch)" -ForegroundColor Cyan
Write-Host ""

$Root = $null
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw
    if ($pkg -match "cheerful-monorepo") {
        Write-Host "Already inside Cheerful repo. Using current directory."
        $Root = (Get-Location).Path
    }
}

if (-not $Root) {
    if (Test-Path $InstallDir) {
        if (Test-Path "$InstallDir\package.json") {
            Write-Host "Directory $InstallDir already exists. Using it."
            $Root = (Resolve-Path $InstallDir).Path
        }
    }
}

if (-not $Root) {
    Write-Host "Cloning into $InstallDir ..."
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Host "Error: git is required. Install Git for Windows: https://git-scm.com/download/win" -ForegroundColor Red
        exit 1
    }
    git clone --depth 1 --branch $Branch $RepoUrl $InstallDir
    $Root = (Resolve-Path $InstallDir).Path
}

Write-Host ""
Write-Host "Installing dependencies (yarn) ..."
Push-Location $Root
try {
    if (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
        Write-Host "Error: yarn is required. Install Node.js and run: npm install -g yarn" -ForegroundColor Red
        exit 1
    }
    yarn install
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Cheerful is ready at: $Root"
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host ""
Write-Host "1. Server (in one terminal):"
Write-Host "   cd $Root\packages\cheerful-server"
Write-Host "   # Create .env with: DATABASE_URL, CHEERFUL_USERNAME, CHEERFUL_PASSWORD, PORT=3005"
Write-Host "   yarn db:generate; yarn db:migrate; yarn dev"
Write-Host ""
Write-Host "2. CLI (in another terminal):"
Write-Host "   cd $Root\packages\cheerful-cli"
Write-Host "   `$env:CHEERFUL_SERVER_URL = `"http://YOUR_IP:3005`""
Write-Host "   .\bin\cheerful.mjs auth login"
Write-Host "   .\bin\cheerful.mjs cursor"
Write-Host ""
Write-Host "3. Full guide: $Root\docs\INSTALL.md"
Write-Host ""
