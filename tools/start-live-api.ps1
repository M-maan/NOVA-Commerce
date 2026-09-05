$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $root 'apps\api'
$stdout = Join-Path $PSScriptRoot 'live-api.log'
$stderr = Join-Path $PSScriptRoot 'live-api.err.log'

$postgres = (docker inspect nova-commerce-postgres-1 | ConvertFrom-Json)[0]
$postgresSettings = @{}
foreach ($entry in $postgres.Config.Env) {
  $pair = $entry -split '=', 2
  if ($pair.Count -eq 2) { $postgresSettings[$pair[0]] = $pair[1] }
}

$redis = (docker inspect nova-commerce-redis-1 | ConvertFrom-Json)[0]
$redisSettings = @{}
foreach ($entry in $redis.Config.Env) {
  $pair = $entry -split '=', 2
  if ($pair.Count -eq 2) { $redisSettings[$pair[0]] = $pair[1] }
}

$databaseUser = $postgresSettings['POSTGRES_USER']
$databasePassword = [Uri]::EscapeDataString($postgresSettings['POSTGRES_PASSWORD'])
$databaseName = $postgresSettings['POSTGRES_DB']
if (-not $databaseUser -or -not $databasePassword -or -not $databaseName) {
  throw 'PostgreSQL container settings are incomplete.'
}

$env:DATABASE_URL = "postgresql://${databaseUser}:${databasePassword}@localhost:5432/${databaseName}?schema=public"
$redisPassword = if ($redisSettings['REDIS_PASSWORD']) { $redisSettings['REDIS_PASSWORD'] } else { 'change-me' }
$env:REDIS_URL = "redis://:$([Uri]::EscapeDataString($redisPassword))@localhost:6380"

$existing = Get-NetTCPConnection -State Listen -LocalPort 4000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($existing.OwningProcess)"
  if ($process.Name -ne 'node.exe') { throw 'Port 4000 is owned by an unexpected process.' }
  Stop-Process -Id $existing.OwningProcess
}

$api = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' `
  -ArgumentList @('dist\main.js') `
  -WorkingDirectory $apiRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr `
  -PassThru

Start-Sleep -Seconds 4
Write-Output "API_PID=$($api.Id)"
Invoke-RestMethod 'http://localhost:4000/api/v1/health' | ConvertTo-Json -Depth 5 -Compress
