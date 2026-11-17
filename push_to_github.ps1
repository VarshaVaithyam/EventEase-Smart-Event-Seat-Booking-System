Set-Location $PSScriptRoot

Write-Host "=== Current directory ===" -ForegroundColor Cyan
Get-Location

Write-Host "=== Git status ===" -ForegroundColor Cyan
git status

Write-Host "=== Remotes ===" -ForegroundColor Cyan
git remote -v

# Init if not a git repo
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repo..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Remove existing origin if any, add correct one
$remote = git remote 2>&1
if ($remote -match "origin") {
    git remote remove origin
}

git remote add origin https://github.com/VarshaVaithyam/EventEase-Smart-Event-Seat-Booking-System.git
Write-Host "Remote added." -ForegroundColor Green

# Stage all files
git add .
Write-Host "Files staged." -ForegroundColor Green

# Commit
git commit -m "Initial commit: EventEase Smart Event Seat Booking System"
Write-Host "Committed." -ForegroundColor Green

# Push
git push -u origin main
Write-Host "Pushed to GitHub!" -ForegroundColor Green
