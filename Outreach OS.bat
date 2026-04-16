@echo off
title Outreach OS Server
echo =======================================
echo Booting Outreach OS Database Server...
echo Please wait 5 seconds. Do not close this window!
echo =======================================
cd /d "C:\Users\hp\.gemini\antigravity\scratch\cold-caller"
start /min cmd /c "npm run dev"
timeout /t 5 /nobreak >nul
start chrome --app="http://localhost:3000" || start msedge --app="http://localhost:3000"
exit
