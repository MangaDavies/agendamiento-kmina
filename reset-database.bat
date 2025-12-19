@echo off
echo ========================================
echo  RESETEAR BASE DE DATOS - KMINA SALUD
echo ========================================
echo.
echo Este script eliminara la base de datos actual
echo y creara una nueva con los especialistas reales.
echo.
echo Especialistas que se agregaran:
echo.
echo KINESIOLOGIA:
echo   - Sebastian Davies Tapia
echo   - Eric Farias Gajardo
echo.
echo PSICOLOGIA:
echo   - Estefania Zumaran
echo   - Sussy Aquez Macaya
echo   - Gonzalo Labarca
echo.
echo FONOAUDIOLOGIA:
echo   - Fonoaudiologo (A definir)
echo.
echo NUTRICION:
echo   - Nutricionista (A definir)
echo.
echo ========================================
echo.
pause
echo.
echo Eliminando base de datos antigua...
if exist database.db (
    del database.db
    echo Base de datos eliminada.
) else (
    echo No se encontro base de datos anterior.
)
echo.
echo Iniciando servidor para crear nueva base de datos...
echo Presiona Ctrl+C cuando veas el mensaje de confirmacion.
echo.
node server.js
