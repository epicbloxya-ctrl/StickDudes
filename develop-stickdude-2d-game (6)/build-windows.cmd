@echo off
setlocal
cd /d "%~dp0"
if not exist "package.json" (
  echo This is not the full StickDude project folder. package.json is missing.
  echo Download the project files, not just the game preview.
  pause
  exit /b 1
)
if not exist "scripts\windows-bootstrap.mjs" (
  echo The Windows build files are missing. Download the complete project folder.
  pause
  exit /b 1
)

rem Prefer a real installed Node over stale PATH entries and Windows app aliases.
set "NODE_EXE="
if defined STICKDUDE_NODE_DIR if exist "%STICKDUDE_NODE_DIR%\node.exe" set "NODE_EXE=%STICKDUDE_NODE_DIR%\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if defined NVM_SYMLINK if exist "%NVM_SYMLINK%\node.exe" set "NODE_EXE=%NVM_SYMLINK%\node.exe"
if not defined NODE_EXE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs-lts\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs-lts\current\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" set "NODE_EXE=%USERPROFILE%\scoop\apps\nodejs\current\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\.volta\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.volta\bin\node.exe"
if not defined NODE_EXE for %%N in (node.exe) do if not "%%~$PATH:N"=="" set "NODE_EXE=%%~$PATH:N"

if not defined NODE_EXE (
  echo Could not find node.exe on PATH or in the usual install folders.
  echo In a NEW Command Prompt, try: where node.exe
  echo Also check: dir "C:\Program Files\nodejs\node.exe"
  echo If that file is missing, install Node.js for Windows from nodejs.org.
  pause
  exit /b 1
)

rem Make npm.cmd and child build processes see the same installation.
for %%D in ("%NODE_EXE%") do set "PATH=%%~dpD;%PATH%"
echo Using Node.js: "%NODE_EXE%"
"%NODE_EXE%" --version
if errorlevel 1 (
  echo That node.exe did not run. Install the Windows x64 Node.js release.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js was found, but npm.cmd was not.
  echo Reinstall Node.js for Windows with the npm package manager selected.
  pause
  exit /b 1
)
"%NODE_EXE%" "scripts\windows-bootstrap.mjs"
if errorlevel 1 (
  echo.
  echo Build failed. Send the error shown above or the file build-windows.log.
  pause
  exit /b 1
)
echo.
echo StickDude.exe is ready in this folder. Share only the EXE, not the project files.
pause