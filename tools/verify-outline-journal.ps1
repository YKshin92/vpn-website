param()
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$saved=@{}
foreach($name in @('PGPASSWORD','IEUM_RESTORE_APP_PASSWORD')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $workspace
try{
  $credentials=Import-Clixml (Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml')
  $env:PGPASSWORD=[Net.NetworkCredential]::new('',$credentials.admin).Password
  $env:IEUM_RESTORE_APP_PASSWORD=[Net.NetworkCredential]::new('',$credentials.app).Password
  & node tools/verify-outline-journal.mjs
  if($LASTEXITCODE -ne 0){throw 'Outline journal rehearsal failed; inspect its redacted report'}
}finally{
  foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
  $credentials=$null;Pop-Location
}
