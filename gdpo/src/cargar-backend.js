/* Ejecuta Code.gs dentro del entorno simulado y devuelve sus funciones. */
function cargarBackend(env, fuente) {
  var nombres = ['Date', 'SpreadsheetApp', 'CacheService', 'LockService', 'Utilities', 'ContentService', 'Logger', 'console', 'DriveApp'];
  var valores = nombres.map(function (n) { return env[n]; });
  var api = new Function(nombres.join(','), fuente +
    '\n;return { manejar_: manejar_, configurarBitacora: configurarBitacora, limpiarCache: limpiarCache,' +
    ' probarBackend: typeof probarBackend === "function" ? probarBackend : null, padron_: padron_, HOJAS: HOJAS };').apply(null, valores);
  return {
    api: api,
    llamar: function (p) {
      api.padron_.m = undefined;           // en Google cada pedido es una ejecución nueva
      var r = api.manejar_(JSON.parse(JSON.stringify(p)));
      return JSON.parse(r.getContent());
    }
  };
}
/* Carga las hojas de contenido en la planilla simulada (mismas filas que las plantillas CSV). */
function sembrarPlanilla(env, C, padron) {
  var L = env._libro;
  function poner(n, filas) { var h = L.getSheetByName(n); if (filas.length) h.getRange(2, 1, filas.length, filas[0].length).setValues(filas); }
  poner('Cronograma', C.cronograma);
  poner('Preguntas', C.filasPreguntas());
  poner('EntregasTP', C.entregasTP);
  poner('Docentes', C.docentes);
  poner('Padron', padron);
  var hc = L.getSheetByName('Config');
  hc.filas.forEach(function (f) { if (f[0] === 'caso_tp') f[1] = C.caso; if (f[0] === 'prueba_carga') f[1] = 'SI'; });
}
if (typeof module !== 'undefined') module.exports = { cargarBackend: cargarBackend, sembrarPlanilla: sembrarPlanilla };
