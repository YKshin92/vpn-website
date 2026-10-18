$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$saved=@{}
foreach($name in @('PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PORT')){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$child=$null
Push-Location $workspace
try{
  if(Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue){throw 'Port 3000 is occupied; no process was stopped'}
  $c=Import-Clixml (Join-Path $env:LOCALAPPDATA 'IeumVPN\postgres-local\credentials.xml')
  $env:PGHOST='127.0.0.1';$env:PGPORT='5432';$env:PGDATABASE='ieum_vpn_dev';$env:PGUSER='ieum_app';$env:PORT='3000'
  $env:PGPASSWORD=[Net.NetworkCredential]::new('',$c.app).Password
  $node=(Get-Command node.exe).Source
  for($iteration=1;$iteration -le 2;$iteration++){
    $child=Start-Process -FilePath $node -ArgumentList '.build/server.js' -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $workspace 'backend-http-test.log') -RedirectStandardError (Join-Path $workspace 'backend-http-test-error.log')
    $ready=$false
    for($attempt=0;$attempt -lt 30;$attempt++){
      if($child.HasExited){throw 'HTTP server exited before ready'}
      try{$health=Invoke-RestMethod 'http://127.0.0.1:3000/api/health' -TimeoutSec 1;if($health.status -eq 'ok'){$ready=$true;break}}catch{Start-Sleep -Milliseconds 150}
    }
    if(-not $ready){throw 'HTTP readiness timeout'}
    foreach($route in @('customers','keys','servers')){
      $status=0
      try{Invoke-WebRequest ('http://127.0.0.1:3000/api/dev/'+$route) -UseBasicParsing|Out-Null}catch{$status=[int]$_.Exception.Response.StatusCode}
      if($status -ne 401){throw 'Anonymous data access was not denied'}
    }
    $listen=@(Get-NetTCPConnection -State Listen -LocalPort 3000)
    if($listen | Where-Object {$_.LocalAddress -ne '127.0.0.1' -or $_.OwningProcess -ne $child.Id}){throw 'Unexpected HTTP listener'}
    Stop-Process -Id $child.Id
    $child.WaitForExit();$child=$null
    Write-Output ('HTTP run '+$iteration+': health ok, anonymous data access denied, localhost only')
  }
}finally{
  if($child -and -not $child.HasExited){Stop-Process -Id $child.Id;$child.WaitForExit()}
  foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
  $c=$null;Pop-Location
}
