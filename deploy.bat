@echo off
echo Subiendo cambios a GitHub...
git add .
git commit -m "Actualizacion ia 13/11/2026"
git push origin main

echo Lanzando despliegue directo en Vercel...
vercel --prod

pause
