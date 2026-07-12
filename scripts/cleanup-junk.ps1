# Removes temporary logs, scrape artifacts, probe/bench scripts, and other non-essential files.
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$removed = @()

function Remove-IfExists($path) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
    $script:removed += $path.Replace($root + "\", "")
  }
}

$keepRootFiles = @(
  "package.json", "package-lock.json", "tsconfig.json", "next.config.mjs",
  "postcss.config.mjs", "tailwind.config.ts", "next-env.d.ts", ".env.local",
  ".gitignore", "build-portal.bat", "start-only.bat", "start-portal.bat",
  "ingest-circulars.bat", "ingest-notifications.bat", "ingest-orders.bat",
  "extract-document-legal-status.bat", "extract-notification-changes.bat",
  "generate-circular-summaries.bat", "generate-notification-summaries.bat",
  "generate-order-summaries.bat", "refresh-summaries.bat",
  "rebuild_full_catalog.bat", "reclassify-and-reconcile.bat",
  "run_all_scripts.bat", "run_build_clean.bat", "run_generate_and_verify.bat",
  "rebuild-gst-advisories.bat", "rebuild-gst-press-releases-catalog.bat",
  "GST_Acts_and_Rules.docx", "Finance_Acts_GST_Provisions.docx"
)

Get-ChildItem -File | ForEach-Object {
  $name = $_.Name
  if ($keepRootFiles -contains $name) { return }

  $remove = $false
  if ($name -like "_*") { $remove = $true }
  elseif ($name -match "\.log$") { $remove = $true }
  elseif ($name -match "\.(err|txt)$" -and $name -notmatch "^README") { $remove = $true }
  elseif ($name -match "^gst_.*\.html$") { $remove = $true }
  elseif ($name -eq "newsupdates_response.json") { $remove = $true }
  elseif ($name -match "\.(vbs|ps1)$") { $remove = $true }
  elseif ($name -match "\.js$" -and $name -notmatch "^next\.config") { $remove = $true }
  elseif ($name -eq "tsconfig.tsbuildinfo") { $remove = $true }
  elseif ($name -eq "run_scrape_runner.py") { $remove = $true }
  elseif ($name -eq "run_scrape.bat") { $remove = $true }
  elseif ($name -in @("acer_logo.png", "GSTActs.png", "GSTRules.png")) { $remove = $true }

  if ($remove) {
    Remove-Item $_.FullName -Force
    $removed += $name
  }
}

$scriptJunk = @(
  "probe_2020.py", "probe_2025.py", "probe_2026.py", "probe_fa_sizes.py",
  "probe_fa2024.py", "probe_pib.py", "test_extract.py", "test_story_pdf.py",
  "fetch_gst_advisories_preview.py", "compare_worksheet.py", "debug_resolve_targets.py",
  "bench-api.ps1", "bench-api-ai-long.mjs", "bench-api-only.mjs",
  "bench-api-standard-warm.mjs", "bench-direct.mjs", "bench-direct-warm.mjs",
  "bench-runner.mjs", "bench-search.mjs", "run-all-bench.bat", "run-bench-direct.bat",
  "run-api-ai.vbs", "run-api-bench.vbs", "run-api-warm.vbs", "run-bench-detached.vbs",
  "run-direct-warm.vbs", "start-dev-hidden.vbs"
)
foreach ($name in $scriptJunk) {
  Remove-IfExists (Join-Path $root "scripts\$name")
}

$dataJunk = @(
  "data\scrape_pr_out.txt",
  "data\download_pr_out.txt",
  "data\finance_acts_source\scan_out.txt",
  "data\pdf_documents.json.corrupt.bak",
  "_debug_resolve.json"
)
foreach ($rel in $dataJunk) {
  Remove-IfExists (Join-Path $root $rel)
}

Get-ChildItem -Path $root -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-IfExists $_.FullName }

Write-Host "Removed $($removed.Count) items."
$removed | Sort-Object | ForEach-Object { Write-Host "  $_" }