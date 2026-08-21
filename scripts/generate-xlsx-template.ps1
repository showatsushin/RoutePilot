$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$projectRoot = Split-Path -Parent $PSScriptRoot
$csvPath = Join-Path $projectRoot 'public\samples\delivery-plan-template.csv'
$outputPath = Join-Path $projectRoot 'public\samples\delivery-plan-template.xlsx'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("routepilot-xlsx-" + [guid]::NewGuid().ToString('N'))

function Escape-Xml([string]$Value) {
  return [System.Security.SecurityElement]::Escape($Value)
}

try {
  New-Item -ItemType Directory -Path (Join-Path $temporaryRoot '_rels') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $temporaryRoot 'xl\_rels') -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $temporaryRoot 'xl\worksheets') -Force | Out-Null

  $headers = @('delivery_id','customer_name','address','time_window_start','time_window_end','service_minutes','package_count','priority','preferred_vehicle','notes')
  $records = Import-Csv -LiteralPath $csvPath -Encoding UTF8
  $rows = @(,$headers) + @($records | ForEach-Object { $record = $_; ,@($headers | ForEach-Object { [string]$record.$_ }) })
  $sheetRows = for ($rowIndex = 0; $rowIndex -lt $rows.Count; $rowIndex++) {
    $cells = for ($columnIndex = 0; $columnIndex -lt $headers.Count; $columnIndex++) {
      $columnName = ''
      $number = $columnIndex + 1
      while ($number -gt 0) { $number--; $columnName = [char](65 + ($number % 26)) + $columnName; $number = [math]::Floor($number / 26) }
      $cellReference = "$columnName$($rowIndex + 1)"
      $value = Escape-Xml ([string]$rows[$rowIndex][$columnIndex])
      "<c r=`"$cellReference`" t=`"inlineStr`"><is><t xml:space=`"preserve`">$value</t></is></c>"
    }
    "<row r=`"$($rowIndex + 1)`">$($cells -join '')</row>"
  }

  $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'
  $rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
  $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="delivery_plan" sheetId="1" r:id="rId1"/></sheets></workbook>'
  $workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'
  $worksheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ($sheetRows -join '') + '</sheetData></worksheet>'

  Set-Content -LiteralPath (Join-Path $temporaryRoot '[Content_Types].xml') -Value $contentTypes -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $temporaryRoot '_rels\.rels') -Value $rootRels -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $temporaryRoot 'xl\workbook.xml') -Value $workbook -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $temporaryRoot 'xl\_rels\workbook.xml.rels') -Value $workbookRels -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $temporaryRoot 'xl\worksheets\sheet1.xml') -Value $worksheet -Encoding UTF8

  if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
  $archiveStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
  $archive = New-Object System.IO.Compression.ZipArchive($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    $entries = @{
      '[Content_Types].xml' = '[Content_Types].xml'
      '_rels/.rels' = '_rels\.rels'
      'xl/workbook.xml' = 'xl\workbook.xml'
      'xl/_rels/workbook.xml.rels' = 'xl\_rels\workbook.xml.rels'
      'xl/worksheets/sheet1.xml' = 'xl\worksheets\sheet1.xml'
    }
    foreach ($entryName in $entries.Keys) {
      $entry = $archive.CreateEntry($entryName)
      $entryStream = $entry.Open()
      $sourceStream = [System.IO.File]::OpenRead((Join-Path $temporaryRoot $entries[$entryName]))
      try { $sourceStream.CopyTo($entryStream) }
      finally { $sourceStream.Dispose(); $entryStream.Dispose() }
    }
  }
  finally { $archive.Dispose(); $archiveStream.Dispose() }
}
finally {
  $resolvedTemp = [System.IO.Path]::GetFullPath($temporaryRoot)
  $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedTemp.StartsWith($systemTemp) -and (Test-Path -LiteralPath $resolvedTemp)) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}
