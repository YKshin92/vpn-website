$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$saved=@{}
foreach($name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $workspace
try{
  $credentials=Import-Clixml (Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml')
  $env:PGHOST='127.0.0.1';$env:PGPORT='5432';$env:PGDATABASE='ieum_vpn_restore_test';$env:PGUSER='ieum_app'
  $env:PGPASSWORD=[Net.NetworkCredential]::new('',$credentials.app).Password
  & node --test tests/restored-api.integration.mjs
  if($LASTEXITCODE -ne 0){throw 'Restored API check failed'}
}finally{
  foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
  $credentials=$null;Pop-Location
}
