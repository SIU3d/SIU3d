<#!
.SYNOPSIS
  Install dependencies (optional) and start both backend and frontend dev servers on Windows/PowerShell.
.DESCRIPTION
  Run from the repo root after unzipping the project. Use -Install first time to fetch npm packages.
.EXAMPLE
  # first run (installs deps, then starts servers)
  ./scripts/windows-dev.ps1 -Install
.EXAMPLE
  # later runs (reuse installed deps, just start servers)
  ./scripts/windows-dev.ps1
#>
param(
  [switch]$Install
)

$ErrorActionPreference = "Stop"

# Resolve repo root from script location so you can run it from anywhere.
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "Using repo root: $Root" -ForegroundColor Cyan

if ($Install) {
  Write-Host "Installing root dev dependencies..." -ForegroundColor Yellow
  npm install

  Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
  npm install --prefix backend

  Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
  npm install --prefix frontend
}

Write-Host "Starting backend (4000) and frontend (5173)..." -ForegroundColor Green
npm run dev
