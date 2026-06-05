@echo off
echo Building auto-weekly-report-creator.exe...
pyinstaller --onefile --windowed --name auto-weekly-report-creator --icon=icons\favicon.ico --add-data "icons;icons" main.py
echo.
echo Done! Check dist\auto-weekly-report-creator.exe
pause
