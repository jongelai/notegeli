@echo off
git add .
git commit -m "deploy %date% %time%"
git push
echo ---
echo 🚀 Batman Deploy completado
pause
