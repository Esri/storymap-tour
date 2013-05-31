@echo off
setlocal enabledelayedexpansion enableextensions

REM Edit PROJECT_DIR to point to your the project folder
REM Require node.js and a JRE6

REM ROOT with src/ deploy/ and tools/
set PROJECT_DIR=%CD%\..

set JS_FILES=
set CSS_FILES=
set NB_JS_FILES=0
set NB_CSS_FILES=0

echo ------------------------------
echo          Clean UP
echo ------------------------------

RD /S /Q %PROJECT_DIR%\deploy

echo ------------------------------
echo          Javascript
echo ------------------------------

echo Minyfing project !PROJECT_DIR!\src\app
node r.js -o maptour.build.viewer.js
node r.js -o maptour.build.builder.js

echo Minyfing libraries !PROJECT_DIR!\src\lib

for /R %PROJECT_DIR%\src\lib %%x in (*.js) do (
	set JS_FILES=!JS_FILES! %%x
	set /a NB_JS_FILES = NB_JS_FILES+ 1
)

echo Found !NB_JS_FILES! js files
echo.

mkdir %PROJECT_DIR%\deploy\app 2> NUL
java -jar %PROJECT_DIR%\tools\compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js %JS_FILES:~1% --js_output_file %PROJECT_DIR%\deploy\app\maptour-lib-min.js


echo ------------------------------
echo             CSS
echo ------------------------------

for /R %PROJECT_DIR%\src\app %%x in (*.css) do (
	set VAR1=%%x

	if "!VAR1:~-14!" NEQ "Responsive.css" set CSS_FILES=%%x+!CSS_FILES!
	set /a NB_CSS_FILES = NB_CSS_FILES+ 1
)

for /R %PROJECT_DIR%\src\lib %%x in (*.css) do (
	set CSS_FILES=%%x+!CSS_FILES!
	set /a NB_CSS_FILES = NB_CSS_FILES+ 1
)

set CSS_FILES=!CSS_FILES:~0,-1!+%PROJECT_DIR%\src\app\storymaps\maptour\ui\Responsive.css
copy /b !CSS_FILES! %PROJECT_DIR%\deploy\app\maptour-min.css

java -jar %PROJECT_DIR%\tools\yuicompressor-2.4.8pre.jar -o %PROJECT_DIR%\deploy\app\maptour-min.css %PROJECT_DIR%\deploy\app\maptour-min.css

cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-min.css "../../../../../" "../"
cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-min.css "../../../../" "../"
cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-min.css "../../../" "../"
cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-min.css "../img/" "../resources/bootstrap/"

echo.
echo ------------------------------
echo            BUILD
echo ------------------------------

xcopy /Y /Q %PROJECT_DIR%\src\lib\bootstrap\img\* %PROJECT_DIR%\deploy\resources\bootstrap\
copy /b /Y %PROJECT_DIR%\deploy\app\maptour-lib-min.js+%PROJECT_DIR%\deploy\app\maptour-app-viewer-min.js "%PROJECT_DIR%\deploy\app\maptour-viewer-min.js"
copy /b /Y %PROJECT_DIR%\deploy\app\maptour-lib-min.js+%PROJECT_DIR%\deploy\app\maptour-app-builder-min.js "%PROJECT_DIR%\deploy\app\maptour-builder-min.js"

del %PROJECT_DIR%\deploy\app\maptour-app-viewer-min.js
del %PROJECT_DIR%\deploy\app\maptour-app-builder-min.js
del %PROJECT_DIR%\deploy\app\maptour-lib-min.js

xcopy /Y /Q %PROJECT_DIR%\src\index.html %PROJECT_DIR%\deploy\
xcopy /Y /Q %PROJECT_DIR%\src\preview.html %PROJECT_DIR%\deploy\

cscript replace.vbs %PROJECT_DIR%\deploy\index.html "var isProduction = false;" "var isProduction = true;"

cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-viewer-min.js "TPL_ENV_DEV" "TPL_ENV_PRODUCTION"
cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-viewer-min.js "TPL_PREVIEW_TRUE" "TPL_PREVIEW_FALSE"

cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-builder-min.js "TPL_ENV_DEV" "TPL_ENV_PRODUCTION"
cscript replace.vbs %PROJECT_DIR%\deploy\app\maptour-builder-min.js "TPL_PREVIEW_TRUE" "TPL_PREVIEW_FALSE"

xcopy /S /Q /I /Y %PROJECT_DIR%\src\resources %PROJECT_DIR%\deploy\resources
xcopy /Y /Q %PROJECT_DIR%\src\app\maptour-config.js %PROJECT_DIR%\deploy\app

echo.
echo Build succeeded
echo.

pause 