param([ValidateSet('migrate','seed','start','test')][string]$Task='start',[ValidateSet('ieum_vpn_dev','ieum_vpn_restore_test')][string]$Database='ieum_vpn_dev')
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$privateFile=Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml'
$saved=@{}
foreach($name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PORT')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $workspace
try{
  if($Database -ne 'ieum_vpn_dev' -and $Task -in @('migrate','seed')){throw 'Migration and seed commands only target the development database'}
  $credentials=Import-Clixml -LiteralPath $privateFile
  $env:PGHOST='127.0.0.1';$env:PGPORT='5432';$env:PGDATABASE=$Database;$env:PORT='3000'
  if($Task -eq 'migrate'){$env:PGUSER='postgres';$secret=$credentials.admin}else{$env:PGUSER='ieum_app';$secret=$credentials.app}
  $env:PGPASSWORD=[Net.NetworkCredential]::new('',$secret).Password
  switch($Task){
    'migrate' {
      $backupDir=Join-Path (Split-Path $privateFile -Parent) 'backups'
      New-Item -ItemType Directory -Path $backupDir -Force|Out-Null
      $backup=Join-Path $backupDir ('before-migrate-'+(Get-Date -Format 'yyyyMMdd-HHmmss-fff')+'.dump')
      & 'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe' -h 127.0.0.1 -p 5432 -U postgres -d ieum_vpn_dev -Fc -f $backup
      if($LASTEXITCODE -ne 0){throw 'Pre-migration backup failed; no migration applied'}
      & node .build/manage.js migrate
    }
    'seed' {& node .build/manage.js seed}
    'start' {& node .build/server.js}
    'test' {& node --test --test-concurrency=1 tests/backend.integration.mjs tests/admin.integration.mjs tests/rotation-jobs.integration.mjs tests/live-rotation.integration.mjs tests/customer-billing.integration.mjs tests/outline.integration.mjs tests/outline-control.integration.mjs tests/outline-review.integration.mjs}
  }
  if($LASTEXITCODE -ne 0){throw ('Backend task failed: '+$Task)}
}finally{
  foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
  $credentials=$null;$secret=$null;Pop-Location
}
