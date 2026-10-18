$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$saved=@{}
foreach($name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','IEUM_RESTORE_APP_PASSWORD')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $workspace
try{
  $privateFile=Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml'
  $credentials=Import-Clixml -LiteralPath $privateFile
  $env:PGHOST='127.0.0.1';$env:PGPORT='5432';$env:PGDATABASE='ieum_vpn_dev';$env:PGUSER='postgres'
  $env:PGPASSWORD=[Net.NetworkCredential]::new('',$credentials.admin).Password
  $env:IEUM_RESTORE_APP_PASSWORD=[Net.NetworkCredential]::new('',$credentials.app).Password
  & node tools/verify-db-restore.mjs
  if($LASTEXITCODE -ne 0){throw 'Restore verification failed; inspect protected result before retrying'}
}finally{
  foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
  $credentials=$null;Pop-Location
}
