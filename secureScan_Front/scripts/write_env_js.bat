@echo off
REM Writes a runtime __env.js file into the project's public\ directory (for dev) or into the given output dir.
REM Usage: write_env_js.bat [API_BASE] [output_dir]

setlocal enabledelayedexpansion
set API_BASE=%1
if "%API_BASE%"=="" set API_BASE=%VITE_API_BASE%
if "%API_BASE%"=="" set API_BASE=http://127.0.0.1:8080
set OUT_DIR=%2
if "%OUT_DIR%"=="" set OUT_DIR=public

if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"

>"%OUT_DIR%\__env.js" (echo window.__CONFIG__ = {)
>>"%OUT_DIR%\__env.js" (echo   API_BASE: "%API_BASE%" )
>>"%OUT_DIR%\__env.js" (echo };)

echo Wrote %OUT_DIR%\__env.js with API_BASE=%API_BASE%
