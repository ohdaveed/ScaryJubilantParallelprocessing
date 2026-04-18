$baseUrl = "http://localhost:3001"
$results = New-Object System.Collections.Generic.List[PSObject]

# 1 & 2: Chat
$generateChatBody = @{
    prompt = "Create a test page about AI"
    context = ""
}

$refineChatBody = @{
    prompt = "Add details"
    context = "AI is cool"
}

$chatTests = @(
    @{ n = "generate path"; p = "/api/chat"; b = $generateChatBody },
    @{ n = "refine path"; p = "/api/chat"; b = $refineChatBody }
)

foreach ($t in $chatTests) {
    try {
        $r = Invoke-WebRequest -Uri "$baseUrl$($t.p)" -Method POST -Body ($t.b | ConvertTo-Json) -ContentType "application/json"
        $results.Add([PSCustomObject]@{Name=$t.n; Result="PASS"; Details="Status: $($r.StatusCode), Length: $($r.Content.Length)"})
    } catch { $results.Add([PSCustomObject]@{Name=$t.n; Result="FAIL"; Details=$_.Exception.Message}) }
}

# 3: Import
try {
    $r = Invoke-RestMethod -Uri "$baseUrl/api/pages/import" -Method POST -Body (@{pages=@(@{title="Imported"; content="Content"})} | ConvertTo-Json) -ContentType "application/json"
    if ($r.PSObject.Properties.Name -contains "skippedPlaceholders") {
        $skippedPlaceholdersValue = 0
        $isValidInteger = [int]::TryParse([string]$r.skippedPlaceholders, [ref]$skippedPlaceholdersValue)
        $isNonNegativeInteger = $isValidInteger -and $skippedPlaceholdersValue -ge 0
        if ($isNonNegativeInteger) {
            $results.Add([PSCustomObject]@{Name="import path"; Result="PASS"; Details="Inserted: $($r.inserted), Skipped: $($r.skipped), SkippedPlaceholders: $skippedPlaceholdersValue"})
        } else {
            $results.Add([PSCustomObject]@{Name="import path"; Result="FAIL"; Details="skippedPlaceholders must be a non-negative integer but was '$($r.skippedPlaceholders)'"})
        }
    } else {
        $results.Add([PSCustomObject]@{Name="import path"; Result="FAIL"; Details="Response missing skippedPlaceholders field"})
    }
} catch { $results.Add([PSCustomObject]@{Name="import path"; Result="FAIL"; Details=$_.Exception.Message}) }

# 4: Plan-Link
try {
    $pl = Invoke-RestMethod -Uri "$baseUrl/api/planned-pages" -Method POST -Body (@{title="Temp"} | ConvertTo-Json) -ContentType "application/json"
    $pg = Invoke-RestMethod -Uri "$baseUrl/api/pages" -Method POST -Body (@{draft="Content"; title="Temp"} | ConvertTo-Json) -ContentType "application/json"
    $null = Invoke-WebRequest -Uri "$baseUrl/api/planned-pages/$($pl.id)" -Method PATCH -Body (@{builtPageId=$pg.id} | ConvertTo-Json) -ContentType "application/json"
    $list = Invoke-RestMethod -Uri "$baseUrl/api/planned-pages" -Method GET
    if ($list | Where-Object {$_.id -eq $pl.id -and $_.builtPageId -eq $pg.id}) { $results.Add([PSCustomObject]@{Name="plan-link path"; Result="PASS"; Details="Linked"}) }
    else { $results.Add([PSCustomObject]@{Name="plan-link path"; Result="FAIL"; Details="Link not found"}) }
} catch { $results.Add([PSCustomObject]@{Name="plan-link path"; Result="FAIL"; Details=$_.Exception.Message}) }

# 5: Version Restore
try {
    $p1 = Invoke-RestMethod -Uri "$baseUrl/api/pages" -Method POST -Body (@{draft="V1"; title="VT"; notes="N1"; trigger="manual"} | ConvertTo-Json) -ContentType "application/json"
    $id = $p1.id
    $null = Invoke-RestMethod -Uri "$baseUrl/api/pages" -Method POST -Body (@{id=$id; draft="V2"; title="VT"; notes="N2"; trigger="manual"} | ConvertTo-Json) -ContentType "application/json"
    $vs = Invoke-RestMethod -Uri "$baseUrl/api/pages/$id/versions" -Method GET
    if ($vs.Count -ge 2) {
        $oid = ($vs | Sort-Object timestamp)[0].id
        $null = Invoke-WebRequest -Uri "$baseUrl/api/pages/$id/restore/$oid" -Method POST
        $f = Invoke-RestMethod -Uri "$baseUrl/api/pages" -Method GET | Where-Object {$_.id -eq $id}
        if ($f.draft -eq "V1") { $results.Add([PSCustomObject]@{Name="version restore path"; Result="PASS"; Details="Restored"}) }
        else { $results.Add([PSCustomObject]@{Name="version restore path"; Result="FAIL"; Details="Mismatch: $($f.draft)"}) }
    } else { $results.Add([PSCustomObject]@{Name="version restore path"; Result="FAIL"; Details="Not enough versions"}) }
} catch { $results.Add([PSCustomObject]@{Name="version restore path"; Result="FAIL"; Details=$_.Exception.Message}) }

$results | Format-Table -AutoSize
