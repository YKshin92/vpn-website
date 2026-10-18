param(
  [Parameter(Mandatory=$true)][ValidateSet('read','write')][string]$Mode,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-zA-Z0-9_-]{1,100}$')][string]$Instance
)
$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
try {
  $directory=if($env:IEUM_OUTLINE_SECRET_DIR){$env:IEUM_OUTLINE_SECRET_DIR}else{Join-Path $env:LOCALAPPDATA 'IeumVPN\outline-local'}
  $directory=[IO.Path]::GetFullPath($directory)
  $file=Join-Path $directory ($Instance+'.dpapi')
  if($Mode -eq 'read'){
    if(-not(Test-Path -LiteralPath $file)){[Console]::Write('null');exit 0}
    $encrypted=[IO.File]::ReadAllText($file)
    $secure=ConvertTo-SecureString $encrypted
    [Console]::Write([Net.NetworkCredential]::new('',$secure).Password)
  }else{
    $payload=[Console]::In.ReadToEnd()
    if($payload.Length -gt 8192){throw 'Payload too large'}
    $null=ConvertFrom-Json $payload
    $encrypted=ConvertFrom-SecureString (ConvertTo-SecureString $payload -AsPlainText -Force)
    $null=New-Item -ItemType Directory -Path $directory -Force
    $temporary=Join-Path $directory ([Guid]::NewGuid().ToString()+'.tmp')
    try{[IO.File]::WriteAllText($temporary,$encrypted,[Text.UTF8Encoding]::new($false));Move-Item -LiteralPath $temporary -Destination $file -Force}
    finally{if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary}}
    [Console]::Write('{"saved":true}')
  }
}catch{[Console]::Error.WriteLine('Outline secret store unavailable');exit 1}
