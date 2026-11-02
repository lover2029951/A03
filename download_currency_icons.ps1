# download_currency_icons.ps1 — 抓 PoE 官方通貨圖到 assets\currency\
# 三層來源自動重試：web.poecdn.com(?w=1&h=1) → web.poecdn.com → www.pathofexile.com

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$dir = Join-Path $root 'assets\currency'
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$files = @(
  'CurrencyUpgradeToMagic',       # 蛻變石
  'CurrencyAddModToMagic',        # 增幅石
  'CurrencyRerollMagic',          # 改造石
  'CurrencyConvertToNormal',      # 重鑄石
  'CurrencyUpgradeMagicToRare',   # 富豪石
  'CurrencyUpgradeToRare',        # 點金石
  'CurrencyRerollRare',           # 混沌石
  'CurrencyVaal',                 # 瓦爾寶珠
  'CurrencyModValues',            # 神聖石
  'CurrencyAddModToRare'          # 崇高石
)

$bases = @(
  'https://web.poecdn.com/image/Art/2DItems/Currency/{0}.png?w=1&h=1',
  'https://web.poecdn.com/image/Art/2DItems/Currency/{0}.png',
  'https://www.pathofexile.com/image/Art/2DItems/Currency/{0}.png'
)

try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$okCount = 0
$failed  = @()

foreach ($f in $files) {
  $out = Join-Path $dir "$f.png"
  if ((Test-Path $out) -and ((Get-Item $out).Length -gt 200)) {
    Write-Host ("  [跳過] {0}.png 已存在" -f $f) -ForegroundColor DarkGray
    $okCount++
    continue
  }

  $done = $false
  foreach ($b in $bases) {
    $url = $b -f $f
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $out -TimeoutSec 30 -ErrorAction Stop
      if ((Test-Path $out) -and ((Get-Item $out).Length -gt 200)) {
        Write-Host ("  [完成] {0}.png  <-  {1}" -f $f, $url) -ForegroundColor Green
        $done = $true
        break
      }
    } catch {
      if (Test-Path $out) { Remove-Item $out -Force -ErrorAction SilentlyContinue }
    }
  }

  if ($done) { $okCount++ }
  else { Write-Host ("  [失敗] {0}.png（三個來源都失敗）" -f $f) -ForegroundColor Red; $failed += $f }
}

Write-Host ''
Write-Host ("目標資料夾：{0}" -f $dir)
Write-Host ("成功 {0} / {1}" -f $okCount, $files.Count) -ForegroundColor Cyan
if ($failed.Count -gt 0) {
  Write-Host ("未取得：{0}" -f ($failed -join ', ')) -ForegroundColor Yellow
  Write-Host '（沒關係：遊戲會自動改用官方 CDN，只要連著網路一樣會顯示官方圖）' -ForegroundColor Yellow
}