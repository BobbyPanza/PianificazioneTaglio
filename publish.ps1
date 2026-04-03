# ============================================================
# publish.ps1 - Pubblica PianificazioneTaglio
# Legge BasePath da appsettings.json e lo usa nel build React.
# Eseguire dalla cartella della solution.
# ============================================================

param(
    [string]$Destinazione = "C:\intesi\WS\PianificazioneTaglio"
)

$ErrorActionPreference = "Stop"

# Leggi BasePath da appsettings.json
$appsettings = Get-Content "PianificazioneTaglio\appsettings.json" | ConvertFrom-Json
$basePath = $appsettings.BasePath
if (-not $basePath) { $basePath = "/" }

Write-Host "BasePath: $basePath"
Write-Host "Destinazione: $Destinazione"

# Build React con il base path corretto
Write-Host "`n--- Build frontend ---"
Set-Location "PianificazioneTaglio\clientapp"
npm run build -- --base="$basePath"
Set-Location "..\..\"

# Ferma IIS per liberare il lock sul DLL
Write-Host "`n--- Stop IIS ---"
iisreset /stop | Out-Null

# Publish .NET (senza sovrascrivere appsettings.json in produzione)
Write-Host "`n--- Publish backend ---"
dotnet publish "PianificazioneTaglio\PianificazioneTaglio.csproj" -c Release -o "$Destinazione"

# Ripristina appsettings.json di produzione se esiste backup
$prodSettings = "$Destinazione\appsettings.json"
$backupSettings = "$Destinazione\appsettings.backup.json"
if (Test-Path $backupSettings) {
    Copy-Item $backupSettings $prodSettings -Force
    Write-Host "appsettings.json di produzione ripristinato dal backup."
} else {
    Write-Host "ATTENZIONE: nessun backup appsettings trovato - verificare la configurazione in $prodSettings"
}

# Riavvia IIS
Write-Host "`n--- Start IIS ---"
iisreset /start | Out-Null

Write-Host "`n=== Publish completato ==="
