@echo off
git pull --rebase
git add .
git commit -m "deploy %date% %time%"
git push
pause
