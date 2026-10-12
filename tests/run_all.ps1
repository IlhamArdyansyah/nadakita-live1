$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

node tests/audit_contract.mjs
Get-ChildItem js -Recurse -Filter *.js | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

foreach ($test in @('test_static_ui.py','test_booking_flow.py','test_show_guide.py','test_countdown.py','test_admin_mock.py')) {
  python (Join-Path $PSScriptRoot $test)
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
