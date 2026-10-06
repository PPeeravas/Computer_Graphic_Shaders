@echo off
setlocal enabledelayedexpansion
set BUILD=build
set TARGET=%1
set "TOOLCHAIN_BIN=%~dp0external\toolchains\mingw64\bin"
set "PATH=%TOOLCHAIN_BIN%;%PATH%"

if "%TARGET%"=="" set TARGET=all
if "%TARGET%"=="clean" (
  if exist "%BUILD%" rmdir /s /q "%BUILD%"
  exit /b 0
)

cmake -S . -B %BUILD% -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release ^
  -DCMAKE_C_COMPILER="%TOOLCHAIN_BIN%\gcc.exe" ^
  -DCMAKE_CXX_COMPILER="%TOOLCHAIN_BIN%\g++.exe" ^
  -DCMAKE_MAKE_PROGRAM="%TOOLCHAIN_BIN%\mingw32-make.exe" || exit /b 1

if "%TARGET%"=="all" (
  cmake --build %BUILD% --config Release || exit /b 1
  exit /b 0
)

cmake --build %BUILD% --config Release --target %TARGET% || exit /b 1

set EXE=%BUILD%\%TARGET%.exe
if exist "%BUILD%\Release\%TARGET%.exe" set EXE=%BUILD%\Release\%TARGET%.exe
if not exist "!EXE!" (
  echo could not find !EXE!
  exit /b 1
)
echo running !EXE!
"!EXE!" %2 %3 %4 %5 %6 %7 %8 %9
