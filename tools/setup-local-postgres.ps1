param([Parameter(Mandatory=$true)][string]$Installer)
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$privateRoot=Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local'
$prefix='C:\Program Files\PostgreSQL\17'
$serviceName='ieum-postgresql-17'
$dataDir=Join-Path $prefix 'data'
$resultPath=Join-Path $workspace 'local-postgres-setup-result.json'
$result=@{startedAt=(Get-Date).ToString('o');status='started';service=$serviceName;port=5432}
function Save-Result { $result|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $resultPath -Encoding UTF8 }
function Invoke-Sql([string]$Database,[string]$Sql){
  $Sql | & (Join-Path $prefix 'bin\psql.exe') -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U postgres -d $Database
  if($LASTEXITCODE -ne 0){throw 'PostgreSQL setup SQL failed; inspect local state before retrying'}
}
try {
  if(-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Windows administrator elevation is required'}
  if(Test-Path -LiteralPath $prefix){throw 'PostgreSQL target directory already exists; do not overwrite'}
  if(Get-Service $serviceName -ErrorAction SilentlyContinue){throw 'Target service already exists; do not overwrite'}
  if(Get-NetTCPConnection -State Listen -LocalPort 5432 -ErrorAction SilentlyContinue){throw 'Port 5432 is already in use'}
  $hash=(Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash
  if($hash -ne '612c7f5400a003aaffa0372cb273eed52278f93c680ab911eb9cb2229e329072'){throw 'Installer hash mismatch'}
  if((Get-AuthenticodeSignature -LiteralPath $Installer).Status -ne 'Valid'){throw 'Installer signature invalid'}
  New-Item -ItemType Directory -Path $privateRoot -Force|Out-Null
  $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  & icacls.exe $privateRoot /inheritance:r /grant:r "*${sid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
  if($LASTEXITCODE -ne 0){throw 'Could not restrict private directory access'}
  $bytes=New-Object byte[] 32
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($bytes);$adminPassword=([BitConverter]::ToString($bytes)).Replace('-','')
  $rng.GetBytes($bytes);$appPassword=([BitConverter]::ToString($bytes)).Replace('-','');$rng.Dispose()
  $credentialsPath=Join-Path $privateRoot 'credentials.xml'
  @{admin=(ConvertTo-SecureString $adminPassword -AsPlainText -Force);app=(ConvertTo-SecureString $appPassword -AsPlainText -Force)} | Export-Clixml -LiteralPath $credentialsPath
  $options=Join-Path $privateRoot 'installer-options.txt'
  @("mode=unattended","unattendedmodeui=none","prefix=$prefix","datadir=$dataDir","serverport=5432","servicename=$serviceName","superaccount=postgres","superpassword=$adminPassword","serviceaccount=NT AUTHORITY\NetworkService","enable-components=server,commandlinetools","disable-components=pgAdmin,stackbuilder")|Set-Content -LiteralPath $options -Encoding ASCII
  $result.status='installing';Save-Result
  $proc=Start-Process -FilePath $Installer -ArgumentList @('--optionfile',('"'+$options+'"')) -WindowStyle Hidden -Wait -PassThru
  $result.installerExitCode=$proc.ExitCode
  if($proc.ExitCode -ne 0){throw ('Installer failed with exit code '+$proc.ExitCode)}
  Remove-Item -LiteralPath $options
  Stop-Service $serviceName
  Add-Content -LiteralPath (Join-Path $dataDir 'postgresql.conf') -Value "`n# IEUM local development only`nlisten_addresses = '127.0.0.1'`npassword_encryption = 'scram-sha-256'"
  @('host all all 127.0.0.1/32 scram-sha-256','host all all 0.0.0.0/0 reject','host all all ::0/0 reject')|Set-Content -LiteralPath (Join-Path $dataDir 'pg_hba.conf') -Encoding ASCII
  Set-Service $serviceName -StartupType Manual
  Start-Service $serviceName
  $env:PGPASSWORD=$adminPassword
  Invoke-Sql 'postgres' "CREATE ROLE ieum_app LOGIN PASSWORD '$appPassword' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;"
  Invoke-Sql 'postgres' 'CREATE DATABASE ieum_vpn_dev OWNER postgres;'
  Invoke-Sql 'postgres' 'REVOKE ALL ON DATABASE ieum_vpn_dev FROM PUBLIC; GRANT CONNECT ON DATABASE ieum_vpn_dev TO ieum_app;'
  Invoke-Sql 'ieum_vpn_dev' 'REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ieum_app; CREATE SCHEMA ieum_setup_probe; CREATE TABLE ieum_setup_probe.persistence_check (marker integer PRIMARY KEY); INSERT INTO ieum_setup_probe.persistence_check VALUES (1);'
  Restart-Service $serviceName
  Invoke-Sql 'ieum_vpn_dev' "DO `$`$ BEGIN IF (SELECT count(*) FROM ieum_setup_probe.persistence_check WHERE marker=1)<>1 THEN RAISE EXCEPTION 'Persistence verification failed'; END IF; END `$`$; DROP SCHEMA ieum_setup_probe CASCADE;"
  $env:PGPASSWORD=$appPassword
  $check='SELECT current_database(), current_user, has_database_privilege(current_user,current_database(),''CONNECT'') AS can_connect, has_database_privilege(current_user,current_database(),''CREATE'') AS can_create, has_schema_privilege(current_user,''public'',''CREATE'') AS can_create_public;'
  $check | & (Join-Path $prefix 'bin\psql.exe') -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U ieum_app -d ieum_vpn_dev
  if($LASTEXITCODE -ne 0){throw 'Application account verification failed'}
  $env:PGPASSWORD=$adminPassword
  Invoke-Sql 'ieum_vpn_dev' "DO `$`$ BEGIN IF EXISTS(SELECT FROM pg_roles WHERE rolname='ieum_app' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication)) OR has_database_privilege('ieum_app','ieum_vpn_dev','CREATE') OR has_schema_privilege('ieum_app','public','CREATE') THEN RAISE EXCEPTION 'Application permissions exceed expected scope'; END IF; END `$`$;"
  $listeners=@(Get-NetTCPConnection -State Listen -LocalPort 5432)
  if($listeners|Where-Object {$_.LocalAddress -ne '127.0.0.1'}){throw 'Unexpected non-local database listener'}
  $result.status='success';$result.version=(& (Join-Path $prefix 'bin\psql.exe') --version);$result.database='ieum_vpn_dev';$result.appRole='ieum_app';$result.dataDirectory=$dataDir;$result.credentialsFile=$credentialsPath;$result.restartPersistenceVerified=$true;$result.listener='127.0.0.1:5432';$result.startupType='Manual';$result.finishedAt=(Get-Date).ToString('o');Save-Result
} catch {
  $result.status='failed';$result.error=$_.Exception.Message;Save-Result
  if(Get-Service $serviceName -ErrorAction SilentlyContinue){Stop-Service $serviceName -ErrorAction SilentlyContinue}
  exit 1
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  if($options -and (Test-Path -LiteralPath $options)){Remove-Item -LiteralPath $options}
  $adminPassword=$null;$appPassword=$null
}
