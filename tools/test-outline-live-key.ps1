param([switch]$ApprovedLiveKeyTest)
$ErrorActionPreference='Stop'
if(-not $ApprovedLiveKeyTest){throw 'Explicit -ApprovedLiveKeyTest is required after user approval'}
$workspace=Split-Path $PSScriptRoot -Parent
$saved=@{}
$names=@('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','IEUM_AWS_READ_ONLY','IEUM_AWS_PROFILE','IEUM_AWS_ACCOUNT_ID','IEUM_DNS_SERVERS','IEUM_LIVE_ROTATION_ENABLED','IEUM_OUTLINE_WRITES_ENABLED')
foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
Push-Location $workspace
try{
 $credentials=Import-Clixml (Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml')
 $env:PGHOST='127.0.0.1';$env:PGPORT='5432';$env:PGDATABASE='ieum_vpn_dev';$env:PGUSER='ieum_app';$env:PGPASSWORD=[Net.NetworkCredential]::new('',$credentials.app).Password
 $env:IEUM_AWS_READ_ONLY='true';$env:IEUM_AWS_PROFILE='ieum-readonly';$env:IEUM_AWS_ACCOUNT_ID='212150478290'
 $env:IEUM_LIVE_ROTATION_ENABLED='false';$env:IEUM_OUTLINE_WRITES_ENABLED='false'
 if(-not $env:IEUM_DNS_SERVERS){$servers=@(Get-NetIPConfiguration|Where-Object {$_.IPv4DefaultGateway}|ForEach-Object {Get-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4}|ForEach-Object {$_.ServerAddresses}|Where-Object {$_ -and $_ -ne '127.0.0.1'}|Select-Object -Unique -First 4);if($servers.Count){$env:IEUM_DNS_SERVERS=$servers -join ','}}
 & node tools/test-outline-live-key.mjs --approved-live-key-test
 if($LASTEXITCODE -ne 0){throw 'Live key test stopped; inspect state and audit records without rerunning'}
}finally{foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')};$credentials=$null;Pop-Location}
