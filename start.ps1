param(
  [int]$Port = 4173,
  [switch]$Open
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:$Port/"

function Resolve-Node {
  $pathNode = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($pathNode) {
    return $pathNode.Source
  }

  $codexNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  if (Test-Path $codexNode) {
    return $codexNode
  }

  throw "Node.js was not found. Install Node.js 20+ or run this from Codex after the workspace runtime is available."
}

function Test-AppServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 2
    return [int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Test-PortInUse {
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

if (Test-AppServer) {
  Write-Host "Build Your Speaker is already running at $url"
  if ($Open) {
    Start-Process $url
  }
  exit 0
}

if (Test-PortInUse) {
  Write-Error "Port $Port is already in use, but the app did not respond at $url. Try another port, for example: .\start.ps1 -Port 4174 -Open"
  exit 1
}

$node = Resolve-Node
Write-Host "Starting Build Your Speaker at $url"
Write-Host "Press Ctrl+C to stop the server."
if ($Open) {
  Start-Job -ScriptBlock {
    param($targetUrl)
    Start-Sleep -Seconds 1
    Start-Process $targetUrl
  } -ArgumentList $url | Out-Null
}

Push-Location $root
try {
  $env:PORT = [string]$Port
  & $node "server.mjs"
} finally {
  Pop-Location
}
