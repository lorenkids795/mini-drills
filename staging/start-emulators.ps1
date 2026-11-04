param([switch]$TestProject)
$ErrorActionPreference='Stop'
$repoRoot=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot
if($env:GOOGLE_APPLICATION_CREDENTIALS -or $env:FIREBASE_CONFIG){throw 'Cloud credential/config environment is forbidden'}
$portableJava=Get-ChildItem -LiteralPath "$repoRoot/tools/emulator-runtime/java" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
if($portableJava){$env:JAVA_HOME=$portableJava.FullName;$env:PATH="$env:JAVA_HOME/bin;$env:PATH"}
$env:FIREBASE_CLI_DISABLE_TELEMETRY='1'
$env:CI='1'
$projectId=if($TestProject){'demo-mini-drills-vocab-test'}else{'demo-mini-drills-vocab'}
$cli=Join-Path $repoRoot 'tools/emulator-runtime/node_modules/firebase-tools/lib/bin/firebase.js'
if(!(Test-Path -LiteralPath $cli)){throw 'Run npm ci --prefix tools/emulator-runtime --ignore-scripts first'}
$argsList=@($cli,'emulators:start','--config','staging/firebase.json','--project',$projectId,'--only','auth,firestore')
if(!$TestProject){$state=Join-Path $repoRoot 'qa-artifacts/phase28/manual-state';$argsList+=@('--export-on-exit',$state);if(Test-Path -LiteralPath "$state/firebase-export-metadata.json"){$argsList+=@('--import',$state)}}
& node @argsList
exit $LASTEXITCODE
