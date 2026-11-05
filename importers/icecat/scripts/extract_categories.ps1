$xmlPath = 'c:\Users\CorentinKERMAN\Documents\Work\Repos\service-hub\importers\icecat\CategoriesList.xml'
[xml]$xml = Get-Content -Raw $xmlPath
$result = @()
$nodes = $xml.SelectNodes("//Category")
# Prefer direct children of CategoriesList to avoid matching unrelated nested Category nodes
$nodes = $null
try { $nodes = $xml.'ICECAT-interface'.Response.CategoriesList.Category } catch { $nodes = $xml.SelectNodes("//CategoriesList/Category") }
foreach($c in $nodes) {
    # ID: prefer attribute ID on the Category element
    $id = $null
    try { $id = $c.GetAttribute('ID') } catch { $id = $null }
    if (-not $id) {
        $idNode = $c.SelectSingleNode('./ID') -or $c.SelectSingleNode('./Id') -or $c.SelectSingleNode('./PK')
        if ($idNode -ne $null) { $id = ([string]$idNode).Trim() }
    }

    # Name: prefer Name element with langid='1' (English). Name values are often in attribute Value
    $name = $null
    if ($c.Name) {
        # $c.Name can be a single node or an array
        if ($c.Name -is [System.Array]) {
            $found = $null
            foreach($n in $c.Name) {
                if (($n.langid -ne $null -and ([string]$n.langid).Trim() -eq '1') -or ($n.Language -ne $null -and ([string]$n.Language).ToUpper() -eq 'EN')) { $found = $n; break }
            }
            if (-not $found) { $found = $c.Name[0] }
            if ($found -ne $null) {
                if ($found.Value) { $name = ([string]$found.Value).Trim() }
                elseif ($found.InnerText) { $name = ([string]$found.InnerText).Trim() }
                else { $name = ([string]$found).Trim() }
            }
        } else {
            $n = $c.Name
                if ($n.Value) { $name = ([string]$n.Value).Trim() }
                elseif ($n.InnerText) { $name = ([string]$n.InnerText).Trim() }
                else { $name = ([string]$n).Trim() }
        }
    } else {
        # try XPath fallback
        $nameNode = $c.SelectSingleNode(".//Name[@langid='1']") -or $c.SelectSingleNode(".//Name[@Language='EN']") -or $c.SelectSingleNode('.//Name')
        if ($nameNode -ne $null) { $name = (([string]$nameNode.Value) -or ([string]$nameNode.InnerText) -or ([string]$nameNode)).Trim() }
    }

    # Parent category: try attribute or child node
    $parentId = $null
    try {
        $pc = $c.SelectSingleNode('./ParentCategory')
    } catch { $pc = $null }
    if ($pc -ne $null) {
        try { $parentId = $pc.GetAttribute('ID') } catch { $parentId = $null }
        if (-not $parentId) {
            $pcIdNode = $pc.SelectSingleNode('./ID') -or $pc.SelectSingleNode('./Id')
            if ($pcIdNode -ne $null) { $parentId = ([string]$pcIdNode).Trim() }
        }
    }
    # ignore self-parenting
    if ($parentId -and $parentId -eq $id) { $parentId = $null }

    if ($id -and $name) {
        $result += @{ id = $id; name = $name; parentId = $parentId }
    }
}
# write flat output with parentId
$flatPath = 'c:\Users\CorentinKERMAN\Documents\Work\Repos\service-hub\importers\icecat\categories_output_flat.json'
$result | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 $flatPath -Force
Write-Output "WROTE: $flatPath"

# build hierarchical tree (children arrays)
$map = @{}
foreach($r in $result) {
    $map[$r.id] = @{ id = $r.id; name = $r.name; parentId = $r.parentId; children = @() }
}
$roots = @()
foreach($id in $map.Keys) {
    $node = $map[$id]
    if ($node.parentId -and $map.ContainsKey($node.parentId)) {
        $map[$node.parentId].children += $node
    } else {
        $roots += $node
    }
}

$treePath = 'c:\Users\CorentinKERMAN\Documents\Work\Repos\service-hub\importers\icecat\categories_output_tree.json'
$roots | ConvertTo-Json -Depth 20 | Out-File -Encoding utf8 $treePath -Force
Write-Output "WROTE: $treePath"