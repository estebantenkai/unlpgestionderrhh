/**
 * PRUEBAS · ejecutar desde el editor de Apps Script (no se exponen en la web).
 *
 *  probarBackend()      revisa que la planilla esté bien cargada antes de habilitar la herramienta.
 *  pruebaRendimiento()  mide en TU cuenta cuánto tarda cada operación con datos de 400 alumnos.
 *                       Crea una planilla temporal, la llena, mide y la manda a la papelera.
 *                       Tarda 2 a 4 minutos. Pegar el registro (Ver > Registros) en el hilo.
 */

function probarBackend() {
  const errores = [], avisos = [];
  const cfg = config_();
  if (!cfg.secreto) errores.push('Falta el secreto: ejecutá configurarBitacora().');

  const crono = cronograma_();
  const cps = crono.filter(function (c) { return c.tiene_checkpoint; });
  if (!cps.length) errores.push('Cronograma sin clases con checkpoint (columna tiene_checkpoint = SI).');
  cps.forEach(function (c) {
    if (!c.abre || !c.cierra) errores.push('Clase ' + c.clase + ': falta fecha de apertura o de cierre.');
    if (c.cierra && c.abre && c.cierra <= c.abre) errores.push('Clase ' + c.clase + ': cierra antes de abrir.');
    if (!c.capsula_url) avisos.push('Clase ' + c.clase + ': todavía sin link de cápsula.');
    const pt = preguntas_()[c.clase + '|teorico'] || [];
    const pc = preguntas_()[c.clase + '|capsula'] || [];
    if (!pt.length) errores.push('Clase ' + c.clase + ': sin preguntas de teórico.');
    if (!pc.length) avisos.push('Clase ' + c.clase + ': sin preguntas de cápsula.');
    pt.forEach(function (q) {
      if (q.tipo === 'opcion') {
        const i = Number(q.correcta);
        if (!(i >= 0 && i < q.opciones.length)) errores.push('Clase ' + c.clase + ' pregunta ' + q.n + ': "correcta" debe ser el número de opción, empezando en 0.');
      }
    });
  });

  const pad = padron_();
  const legajos = Object.keys(pad);
  if (!legajos.length) avisos.push('Padrón vacío: cargalo antes de habilitar a los alumnos.');
  const porGrupo = {};
  legajos.forEach(function (l) {
    const a = pad[l];
    if (!/@/.test(a.mail)) errores.push('Legajo ' + l + ': correo inválido.');
    if (a.dni.length < 7) errores.push('Legajo ' + l + ': DNI incompleto.');
    if (a.grupo) porGrupo[a.grupo] = (porGrupo[a.grupo] || 0) + 1;
    else avisos.push('Legajo ' + l + ': sin grupo asignado.');
  });
  Object.keys(porGrupo).forEach(function (g) { if (porGrupo[g] > 5) avisos.push('Grupo ' + g + ' tiene ' + porGrupo[g] + ' integrantes (máximo acordado: 5).'); });
  const filasPadron = Math.max(0, hoja_('Padron').getLastRow() - 1);
  if (filasPadron > legajos.length) errores.push('Hay legajos repetidos en el padrón (' + filasPadron + ' filas, ' + legajos.length + ' legajos distintos).');

  if (!Object.keys(docentes_()).length) errores.push('No hay docentes cargados.');

  const t = firmar_({ r: 'doc', m: Object.keys(docentes_())[0] || 'x', x: Date.now() + 6e4 });
  if (Object.keys(docentes_()).length && !sesion_({ token: t }, 'doc')) errores.push('La firma de sesiones no funciona.');
  if (sesion_({ token: t.slice(0, -2) + 'xx' }, 'doc')) errores.push('Se aceptó una sesión adulterada.');

  avisos.forEach(function (a) { Logger.log('Aviso · ' + a); });
  if (errores.length) {
    errores.forEach(function (e) { Logger.log('ERROR · ' + e); });
    throw new Error(errores.length + ' error(es). Revisá el registro.');
  }
  Logger.log('TODO OK · ' + cps.length + ' checkpoints, ' + legajos.length + ' alumnos, ' + Object.keys(porGrupo).length + ' grupos.');
}

function pruebaRendimiento() {
  const ALUMNOS = 400, CLASES = 10, REPS = 15;
  const tmp = SpreadsheetApp.create('GDPO · prueba de rendimiento (se borra sola)');
  const out = [];
  try {
    const h = tmp.getSheets()[0];
    h.setName('Intentos');
    h.getRange(1, 1, 1, 13).setValues([HOJAS.Intentos]);
    h.getRange('B:B').setNumberFormat('@');

    // 1) Llenar con un cuatrimestre completo: 400 alumnos x 10 clases x 2 partes = 8.000 filas
    let t = Date.now();
    const filas = [];
    for (let a = 0; a < ALUMNOS; a++) for (let c = 2; c < 2 + CLASES; c++) for (const parte of ['teorico', 'capsula']) {
      filas.push([new Date(), 'L' + (10000 + a), String(c), parte, new Date(), 300, 'NO', 2, 3, 'SI', '{"1":"1","2":"0","3":"2"}', 'A', 'G' + Math.floor(a / 5)]);
    }
    h.getRange(2, 1, filas.length, 13).setValues(filas);
    SpreadsheetApp.flush();
    out.push(['Carga inicial de ' + filas.length + ' filas (una vez)', Date.now() - t]);

    const medir = function (nombre, fn) {
      const ms = [];
      for (let i = 0; i < REPS; i++) { const t0 = Date.now(); fn(i); ms.push(Date.now() - t0); }
      ms.sort(function (a, b) { return a - b; });
      out.push([nombre, ms[Math.floor(ms.length / 2)], ms[Math.floor(ms.length * 0.9)]]);
    };

    // 2) Escritura de una entrega: bloqueo + fila nueva + flush (es lo que serializa)
    medir('Entrega: bloqueo + 1 fila + flush', function (i) {
      const lock = LockService.getScriptLock(); lock.waitLock(10000);
      try { h.getRange(h.getLastRow() + 1, 1, 1, 13).setValues([filas[i]]); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
    });

    // 3) Buscar las filas de un alumno (caché vacía)
    medir('Progreso de un alumno sin caché (TextFinder)', function (i) {
      const celdas = h.getRange(2, 2, h.getLastRow() - 1, 1).createTextFinder('L' + (10000 + i * 7)).matchEntireCell(true).findAll();
      celdas.forEach(function (c) { h.getRange(c.getRow(), 1, 1, 10).getValues(); });
    });

    // 4) Patrón del MBA: leer TODA la hoja en cada pedido
    medir('Leer la hoja completa (patrón MBA)', function () { h.getRange(2, 1, h.getLastRow() - 1, 13).getValues(); });

    // 5) Caché
    const cache = CacheService.getScriptCache();
    const grande = JSON.stringify(filas.slice(0, 300));
    medir('Caché: guardar ~' + Math.round(grande.length / 1024) + ' KB', function (i) { guardarJson_('bench' + i, grande, 60); });
    medir('Caché: leer ~' + Math.round(grande.length / 1024) + ' KB', function (i) { leerJson_('bench' + i); });

    // 6) Validar sesión firmada
    medir('Validar sesión (HMAC, sin planilla)', function () { Utilities.computeHmacSha256Signature('x'.repeat(120), 'secreto-de-prueba'); });

    // 7) Tablero docente: resumen de todo el cuatrimestre
    medir('Tablero docente sin caché (8.000 filas)', function () {
      const v = h.getRange(2, 1, h.getLastRow() - 1, 10).getValues();
      JSON.stringify(v.map(function (f) { return [f[1], f[2], f[3], f[9], f[5]]; }));
    });
  } finally {
    DriveApp.getFileById(tmp.getId()).setTrashed(true);
  }
  Logger.log('RESULTADOS (ms) · operación | mediana | p90');
  out.forEach(function (r) { Logger.log(r.join(' | ')); });
  Logger.log('Pegá estas líneas en el hilo para ajustar la simulación con tus números reales.');
}
