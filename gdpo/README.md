# Bitácora GDPO

Herramienta de cursada de **Gestión y Desarrollo de las Personas en las Organizaciones** (FCE · UNLP):
checkpoints por clase (teórico + cápsula de video o podcast), trabajo práctico grupal secuencial y tablero docente.

Frontend estático para Netlify (`index.html`) y backend gratuito en Google Apps Script con una planilla de Drive como base de datos.

## Qué hay en esta carpeta

| Ruta | Qué es |
|---|---|
| `index.html` | La herramienta. Con `API = ''` funciona en modo demo (150 alumnos ficticios). **Se genera con `node gdpo/build.js`; no editar a mano.** |
| `src/app.html` | Código de la interfaz (alumnos, TP grupal, docentes). |
| `src/contenido.js` | Cronograma 2027 provisorio, 30 preguntas de ejemplo, consignas de la cápsula y caso del TP grupal. |
| `src/demo.js`, `src/gas-mock.js`, `src/cargar-backend.js` | Modo demo: ejecuta el backend real en el navegador sobre una planilla simulada. |
| `backend/Code.gs`, `backend/Pruebas.gs`, `backend/appsscript.json` | Backend de Apps Script. |
| `plantillas/*.csv` | Hojas listas para importar en la planilla (Cronograma, Preguntas, EntregasTP, Docentes, Padron). |
| `pruebas/prueba-carga.html` | Prueba de carga contra el backend real (alumnos virtuales simultáneos). |
| `pruebas/simulacion.py` | Simulación de colas: diseño del MBA contra este diseño, 150 a 400 alumnos. |
| `tests/backend.test.js` | 25 pruebas automáticas del backend (`node gdpo/tests/backend.test.js`). |

## Instalación del backend (una vez por cuatrimestre)

1. Crear una planilla nueva en la carpeta de Drive de la cátedra. Extensiones › Apps Script.
2. Pegar `Code.gs` y `Pruebas.gs` (dos archivos). En Configuración del proyecto, zona horaria Buenos Aires.
3. Ejecutar `configurarBitacora()` y aceptar los permisos.
4. Importar cada CSV de `plantillas/` en su hoja (Archivo › Importar › Reemplazar hoja actual) y pegar el texto de `caso_tp.txt` en Config › `caso_tp`. Cambiar las claves de Docentes.
5. Cargar el padrón real (legajo, DNI, mail, apellido, nombre, comisión, grupo).
6. Ejecutar `probarBackend()` hasta ver **TODO OK**.
7. Implementar › Nueva implementación › Aplicación web · Ejecutar como **Yo** · Acceso **Cualquier persona**.
8. Pegar la URL `/exec` en `var API = ''` de `src/app.html`, correr `node gdpo/build.js` y publicar.

Cada vez que se editan a mano Cronograma, Preguntas, Padron, Docentes o Config: ejecutar `limpiarCache()`.
No borrar ni reordenar filas de las hojas Intentos y TP.

## Pruebas

```
node gdpo/tests/backend.test.js      # lógica del backend
python3 gdpo/pruebas/simulacion.py    # simulación de carga
```

En Apps Script: `pruebaRendimiento()` mide los tiempos reales de la cuenta, y `pruebas/prueba-carga.html` dispara alumnos virtuales contra la aplicación web publicada.
