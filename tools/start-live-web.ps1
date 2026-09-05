$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$webRoot = Join-Path $root 'apps\web'
$stdout = Join-Path $PSScriptRoot 'live-web.log'
$stderr = Join-Path $PSScriptRoot 'live-web.err.log'

$existing = Get-NetTCPConnection -State Listen -LocalPort 3006 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($existing.OwningProcess)"
  if ($process.Name -ne 'node.exe') { throw 'Port 3006 is owned by an unexpected process.' }
  Stop-Process -Id $existing.OwningProcess
}

$web = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList @('node_modules\next\dist\bin\next', 'dev', '-p', '3006') `
  -WorkingDirectory $webRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Start-Sleep -Seconds 6
Write-Output "WEB_PID=$($web.Id)"
$response = Invoke-WebRequest 'http://localhost:3006/' -UseBasicParsing
Write-Output "WEB_STATUS=$($response.StatusCode)"
