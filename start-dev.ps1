$ErrorActionPreference = "Stop"

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$pnpmPath = "C:\Users\travr\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
$nodePath = "C:\Users\travr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$binPath = "C:\Users\travr\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin"

if (-not (Test-Path -LiteralPath $pnpmPath)) {
  Write-Error "Could not find pnpm at $pnpmPath"
}

$env:PATH = "$nodePath;$binPath;$env:PATH"
Set-Location -LiteralPath $projectPath

& $pnpmPath dev
