<#
  Pulls the 4 catalog tables (countries/cities/airports/accommodation areas) from their published
  Google Sheets CSV URLs into data/catalog/*.csv. The Sheet is the only place anyone should edit
  this data; this script is the entire "make the website see my edit" step, run after saving the
  Sheet and before committing + deploying.

  Usage:
    scripts\sync-catalog.ps1
      Reads URLs from scripts\catalog-sources.json (fill that file in once with your Sheet's
      "Publish to web" CSV links - File > Share > Publish to web > pick the tab > CSV).

    scripts\sync-catalog.ps1 -CountriesUrl <url> -CitiesUrl <url> -AirportsUrl <url> -AccommodationAreasUrl <url>
      Overrides catalog-sources.json for a one-off sync (e.g. testing a URL before saving it).
#>
param(
  [string]$CountriesUrl,
  [string]$CitiesUrl,
  [string]$AirportsUrl,
  [string]$AccommodationAreasUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sourcesPath = Join-Path $PSScriptRoot "catalog-sources.json"
$dataDir = Join-Path $root "data\catalog"

$sources = @{}
if (Test-Path $sourcesPath) {
  $json = Get-Content $sourcesPath -Raw | ConvertFrom-Json
  $sources = @{
    countries            = $json.countries
    cities                = $json.cities
    airports              = $json.airports
    accommodationAreas    = $json.accommodationAreas
  }
}

$targets = @(
  @{ Name = "countries"; Url = if ($CountriesUrl) { $CountriesUrl } else { $sources.countries }; File = "countries.csv" }
  @{ Name = "cities"; Url = if ($CitiesUrl) { $CitiesUrl } else { $sources.cities }; File = "cities.csv" }
  @{ Name = "airports"; Url = if ($AirportsUrl) { $AirportsUrl } else { $sources.airports }; File = "airports.csv" }
  @{ Name = "accommodationAreas"; Url = if ($AccommodationAreasUrl) { $AccommodationAreasUrl } else { $sources.accommodationAreas }; File = "accommodation-areas.csv" }
)

if (-not (Test-Path $dataDir)) {
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
}

$failed = @()
$skipped = @()
$synced = @()

foreach ($target in $targets) {
  if ([string]::IsNullOrWhiteSpace($target.Url)) {
    $skipped += $target.Name
    continue
  }
  $destination = Join-Path $dataDir $target.File
  try {
    $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing
    if ($response.StatusCode -ne 200 -or [string]::IsNullOrWhiteSpace($response.Content)) {
      throw "Empty or non-200 response (status $($response.StatusCode))"
    }
    Set-Content -Path $destination -Value $response.Content -Encoding UTF8 -NoNewline
    $synced += $target.Name
  } catch {
    $failed += "$($target.Name): $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Host "Catalog sync result:"
if ($synced.Count -gt 0) { Write-Host "  Synced: $($synced -join ', ')" -ForegroundColor Green }
if ($skipped.Count -gt 0) { Write-Host "  Skipped (no URL set in catalog-sources.json): $($skipped -join ', ')" -ForegroundColor Yellow }
if ($failed.Count -gt 0) {
  Write-Host "  Failed:" -ForegroundColor Red
  $failed | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
  exit 1
}
Write-Host ""
Write-Host "Review the changes in data\catalog\*.csv, then commit and deploy as usual."
