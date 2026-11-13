@echo off
title Notegeli Auto-Deploy
echo ==========================================
echo   Sincronizando con GitHub...
echo ==========================================
git add .
git commit -m "Actualizacion  %date% %time%"
git push origin main

if %errorlevel% neq 0 (
    echo [!] Error al subir a GitHub. Revisa si tienes cambios o si la rama es correcta.
) else (
    echo [OK] GitHub actualizado.
)

echo.
echo ==========================================
echo   Lanzando despliegue en Vercel...
echo ==========================================
vercel --prod

if %errorlevel% neq 0 (
    echo [!] Error en Vercel. Asegurate de haber hecho 'vercel link'.
) else (
    echo [OK] Web actualizada con exito.
)

echo.
echo ==========================================
echo   Proceso terminado.
echo ==========================================
pause