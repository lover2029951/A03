@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo  PoE 官方通貨圖示 - 一鍵下載
echo ============================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0download_currency_icons.ps1"
echo.
pause