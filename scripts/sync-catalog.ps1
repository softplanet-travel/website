<#
  Pulls every Sheet-backed data table this project reads (countries/cities/airports/accommodation
  areas, plus the Flight Guide's "33_Flight Knowledge Master" tab) from their published Google
  Sheets CSV URLs into the matching local CSV file. The Sheet is the only place anyone should edit
  this data; this script is the entire "make the website see my edit" step, run after saving the
  Sheet and before committing + deploying. One script, one config file, for all of it - no separate
  sync mechanism per data set.

  Usage:
    scripts\sync-catalog.ps1
      Reads URLs from scripts\catalog-sources.json (fill that file in once with your Sheet's
      "Publish to web" CSV links - File > Share > Publish to web > pick the tab > CSV).

    scripts\sync-catalog.ps1 -CountriesUrl <url> -CitiesUrl <url> -AirportsUrl <url> -AccommodationAreasUrl <url> -FlightGuideUrl <url>
      Overrides catalog-sources.json for a one-off sync (e.g. testing a URL before saving it).
#>
param(
  [string]$CountriesUrl,
  [string]$CitiesUrl,
  [string]$AirportsUrl,
  [string]$AccommodationAreasUrl,
  [string]$FlightGuideUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sourcesPath = Join-Path $PSScriptRoot "catalog-sources.json"
$dataDir = Join-Path $root "data\catalog"
$flightsDir = Join-Path $root "data\flights"

$sources = @{}
if (Test-Path $sourcesPath) {
  $json = Get-Content $sourcesPath -Raw | ConvertFrom-Json
  $sources = @{
    countries            = $json.countries
    cities                = $json.cities
    airports              = $json.airports
    accommodationAreas    = $json.accommodationAreas
    flightGuide           = $json.flightGuide
  }
}

$targets = @(
  @{ Name = "countries"; Url = if ($CountriesUrl) { $CountriesUrl } else { $sources.countries }; Dir = $dataDir; File = "countries.csv" }
  @{ Name = "cities"; Url = if ($CitiesUrl) { $CitiesUrl } else { $sources.cities }; Dir = $dataDir; File = "cities.csv" }
  @{ Name = "airports"; Url = if ($AirportsUrl) { $AirportsUrl } else { $sources.airports }; Dir = $dataDir; File = "airports.csv" }
  @{ Name = "accommodationAreas"; Url = if ($AccommodationAreasUrl) { $AccommodationAreasUrl } else { $sources.accommodationAreas }; Dir = $dataDir; File = "accommodation-areas.csv" }
  @{ Name = "flightGuide"; Url = if ($FlightGuideUrl) { $FlightGuideUrl } else { $sources.flightGuide }; Dir = $flightsDir; File = "33-flight-knowledge-master.csv" }
)

foreach ($dir in @($dataDir, $flightsDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
}

$failed = @()
$skipped = @()
$synced = @()

foreach ($target in $targets) {
  if ([string]::IsNullOrWhiteSpace($target.Url)) {
    $skipped += $target.Name
    continue
  }
  $destination = Join-Path $target.Dir $target.File
  try {
    $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing
    if ($response.StatusCode -ne 200 -or $response.RawContentLength -eq 0) {
      throw "Empty or non-200 response (status $($response.StatusCode))"
    }
    # Invoke-WebRequest's own .Content string decoding is unreliable on PS 5.1 when the server
    # doesn't declare a charset (Google's CSV export doesn't) - it can silently misdetect the
    # encoding and corrupt every non-ASCII character before we ever write a byte to disk. Decoding
    # the raw response bytes as UTF-8 ourselves is the only way to get this right every time.
    $bytes = $response.RawContentStream.ToArray()
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    if ([string]::IsNullOrWhiteSpace($text)) {
      throw "Empty response body"
    }
    [System.IO.File]::WriteAllText($destination, $text, [System.Text.UTF8Encoding]::new($false))
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
Write-Host "Review the changes in data\catalog\*.csv and data\flights\33-flight-knowledge-master.csv, then commit and deploy as usual."
