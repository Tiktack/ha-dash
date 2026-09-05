[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$')]
    [string] $Owner,

    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string] $Repository = 'ha-dash',

    [string] $Maintainer = $Owner
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$sourceUrl = "https://github.com/$Owner/$Repository"
$imageUrl = "ghcr.io/$($Owner.ToLowerInvariant())/ha-dash"

$replacements = @{
    'https://github.com/change-me/ha-dash' = $sourceUrl
    'ghcr.io/change-me/ha-dash' = $imageUrl
    'maintainer: "change-me"' = ('maintainer: "' + $Maintainer + '"')
}

$files = @(
    (Join-Path $repositoryRoot 'repository.yaml'),
    (Join-Path $repositoryRoot 'ha_dash/config.yaml'),
    (Join-Path $repositoryRoot 'ha_dash/Dockerfile')
)

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file)
    foreach ($entry in $replacements.GetEnumerator()) {
        $content = $content.Replace($entry.Key, $entry.Value)
    }
    [System.IO.File]::WriteAllText($file, $content)
}

Write-Host "Repository configured for $sourceUrl"
Write-Host "Container images will be published to $imageUrl"
