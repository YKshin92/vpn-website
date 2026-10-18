param(
 [Parameter(Mandatory=$true)][ValidatePattern('^\d{12}$')][string]$AccountId,
 [ValidatePattern('^[a-zA-Z0-9_-]+$')][string]$Profile='ieum-readonly',
 [ValidateRange(1,65535)][int]$ServicePort=54137,
 [switch]$EnableLiveChanges
)
$ErrorActionPreference='Stop'
if(-not $EnableLiveChanges){throw 'Explicit -EnableLiveChanges is required after separate operational approval'}
$saved=@{}
foreach($name in @('IEUM_AWS_READ_ONLY','IEUM_AWS_PROFILE','IEUM_AWS_ACCOUNT_ID','IEUM_DNS_SERVERS','IEUM_LIVE_ROTATION_ENABLED','IEUM_OUTLINE_SERVICE_PORT')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
try{
 $env:IEUM_AWS_READ_ONLY='true';$env:IEUM_AWS_PROFILE=$Profile;$env:IEUM_AWS_ACCOUNT_ID=$AccountId;$env:IEUM_LIVE_ROTATION_ENABLED='true'
 $env:IEUM_OUTLINE_SERVICE_PORT=[string]$ServicePort
 if(-not $env:IEUM_DNS_SERVERS){$servers=@(Get-NetIPConfiguration|Where-Object {$_.IPv4DefaultGateway}|ForEach-Object {Get-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4}|ForEach-Object {$_.ServerAddresses}|Where-Object {$_ -and $_ -ne '127.0.0.1'}|Select-Object -Unique -First 4);if($servers.Count){$env:IEUM_DNS_SERVERS=$servers -join ','}}
 & (Join-Path $PSScriptRoot 'backend.ps1') -Task start
}finally{foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
