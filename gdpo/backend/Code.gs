/**
 * BITÁCORA GDPO · Gestión y Desarrollo de las Personas en las Organizaciones · UNLP
 * Backend en Google Apps Script. La planilla es la base de datos.
 *
 * Instalación (una sola vez):
 *  1) Crear una planilla nueva en Drive > Extensiones > Apps Script > pegar este archivo.
 *  2) Ejecutar configurarBitacora()  -> crea las hojas y un secreto para firmar sesiones.
 *  3) Cargar las hojas Cronograma, Preguntas, EntregasTP, Padron, Docentes (ver plantillas).
 *  4) Ejecutar probarBackend()        -> debe terminar con "TODO OK".
 *  5) Implementar > Nueva implementación > Aplicación web
 *       Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 *  6) Pegar la URL /exec en la constante API del index.html.
 *
 * Diseño pensado para 150 a 400 alumnos con carga simultánea:
 *  - Las lecturas salen de CacheService (no tocan la planilla en el 90 % de los casos).
 *  - Las escrituras son una fila por evento y el bloqueo dura sólo lo que tarda esa fila.
 *  - El inicio de cada checkpoint NO escribe en la planilla: queda en caché y firmado.
 *  - Las sesiones son tokens firmados (HMAC): validar una sesión no lee la planilla.
 *
 * IMPORTANTE: no renombrar hojas ni columnas a mano.
 */

const CFG = {
  ESPERA_BLOQUEO_MS: 12000,
  MAX_CARACTERES: 40000,       // límite de celda de Sheets: 50.000
  MAX_CAMBIOS: 20,
  TTL_CACHE: 21600,            // 6 h, máximo de CacheService
  TTL_RESUMEN: 60,             // el tablero docente se recalcula como mucho cada minuto
  DURACION_SESION_H: 24 * 30,  // el alumno no tiene que volver a entrar en todo el mes
  PROTECCION: '​'
};

const HOJAS = {
  Config:     ['clave', 'valor', 'descripcion'],
  Cronograma: ['clase', 'fecha', 'unidad', 'tema', 'abre', 'cierra', 'tiene_checkpoint', 'capsula_titulo', 'capsula_url'],
  Preguntas:  ['clase', 'parte', 'n', 'tipo', 'enunciado', 'opciones', 'correcta'],
  EntregasTP: ['entrega', 'clase', 'titulo', 'consigna', 'abre', 'vence'],
  Padron:     ['legajo', 'dni', 'mail', 'apellido', 'nombre', 'comision', 'grupo'],
  Docentes:   ['mail', 'nombre', 'rol', 'clave'],
  Intentos:   ['ts', 'legajo', 'clase', 'parte', 'inicio', 'segundos', 'excedido', 'correctas', 'total', 'aprobado', 'respuestas', 'comision', 'grupo'],
  TP:         ['clave', 'grupo', 'campo', 'valor', 'autor', 'ts'],
  TPHistorial:['fecha', 'grupo', 'campo', 'autor', 'valor'],
  Notas:      ['grupo', 'nota', 'comentario', 'docente', 'ts'],
  Carga:      ['ts', 'quien', 'dato']
};

const CONFIG_INICIAL = [
  ['cuatrimestre', '1C 2027', 'Se muestra en la pantalla de ingreso'],
  ['minutos_sugeridos', 10, 'Tiempo sugerido por parte. No corta la actividad.'],
  ['excedido_desaprueba', 'NO', 'SI: pasarse del tiempo sugerido marca desaprobado. NO: sólo se informa.'],
  ['minimo_correctas', 2, 'Correctas necesarias en el teórico (sobre 3)'],
  ['aprobados_promocion', 8, 'Checkpoints aprobados para promoción'],
  ['aprobados_regular', 5, 'Checkpoints aprobados para rendir final (a confirmar)'],
  ['dias_cierre', 15, 'Días que queda abierto un checkpoint después de terminada la unidad'],
  ['caso_tp', '', 'Texto del caso del TP grupal que ven todos los grupos'],
  ['prueba_carga', 'NO', 'SI sólo mientras se corre prueba-carga.html; después volver a NO'],
  ['secreto', '', 'Lo genera configurarBitacora(). No compartir.']
];

/* =========================================================
   CONFIGURACIÓN INICIAL
   ========================================================= */

function configurarBitacora() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach(function (n) { crearHoja_(ss, n, HOJAS[n]); });
  ['Padron', 'Docentes', 'TP', 'TPHistorial', 'Intentos', 'Notas', 'Preguntas'].forEach(function (n) {
    ss.getSheetByName(n).getRange('A:M').setNumberFormat('@');   // legajos, DNI y textos como texto plano
  });
  const hc = ss.getSheetByName('Config');
  if (hc.getLastRow() < 2) hc.getRange(2, 1, CONFIG_INICIAL.length, 3).setValues(CONFIG_INICIAL);
  const filas = hc.getRange(2, 1, hc.getLastRow() - 1, 2).getValues();
  filas.forEach(function (f, i) {
    if (f[0] === 'secreto' && !f[1]) hc.getRange(i + 2, 2).setValue(Utilities.getUuid() + Utilities.getUuid());
  });
  SpreadsheetApp.flush();
  limpiarCache();
  Logger.log('Listo. Cargá Cronograma, Preguntas, EntregasTP, Padron y Docentes.');
}

/** Ejecutar después de editar a mano Cronograma, Preguntas, Padron, Docentes o Config. */
function limpiarCache() {
  CacheService.getScriptCache().removeAll(['cfg#n', 'crono#n', 'preg#n', 'entTP#n', 'padron#n', 'docentes#n', 'notas#n', 'resumen#n', 'idxTP#n']);
  Logger.log('Caché limpia: los cambios de la planilla ya se ven en la herramienta.');
}

/* =========================================================
   PUNTOS DE ENTRADA WEB
   ========================================================= */

function doGet(e) { return manejar_(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  let p = {};
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'formato' }); }
  return manejar_(p);
}

function manejar_(p) {
  try {
    switch (p.accion) {
      case 'ping':        return json_({ ok: true, t: Date.now() });
      case 'ingresar':    return json_(ingresar_(p));
      case 'estado':      return json_(estado_(p));
      case 'comenzar':    return json_(comenzar_(p));
      case 'entregar':    return json_(entregar_(p));
      case 'tpLeer':      return json_(tpLeer_(p));
      case 'tpVersion':   return json_(tpVersion_(p));
      case 'tpGuardar':   return json_(tpGuardar_(p));
      case 'docIngresar': return json_(docIngresar_(p));
      case 'docResumen':  return json_(docResumen_(p));
      case 'docTP':       return json_(docTP_(p));
      case 'docNota':     return json_(docNota_(p));
      case 'carga':       return json_(carga_(p));
      default:            return json_({ ok: false, error: 'accion' });
    }
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'servidor' });
  }
}

/* =========================================================
   ALUMNOS
   ========================================================= */

/** Ingreso con correo institucional + legajo + DNI, contra el padrón. */
function ingresar_(p) {
  const mail = norm_(p.mail), legajo = normLegajo_(p.legajo), dni = soloDigitos_(p.dni);
  if (!mail || !legajo || !dni) return { ok: false, error: 'datos' };
  const al = padron_()[legajo];
  if (!al || al.mail !== mail || al.dni !== dni) return { ok: false, error: 'acceso' };
  const token = firmar_({ r: 'al', l: legajo, x: Date.now() + CFG.DURACION_SESION_H * 3600e3 });
  return Object.assign({ ok: true, token: token }, estadoDe_(al));
}

function estado_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const al = padron_()[s.l];
  if (!al) return { ok: false, error: 'sesion' };
  return Object.assign({ ok: true }, estadoDe_(al));
}

function estadoDe_(al) {
  const cfg = config_();
  const comp = al.grupo ? Object.keys(padron_()).map(function (k) { return padron_()[k]; })
    .filter(function (x) { return x.grupo === al.grupo; })
    .map(function (x) { return x.nombre + ' ' + x.apellido; }) : [];
  return {
    yo: { legajo: al.legajo, nombre: al.nombre, apellido: al.apellido, comision: al.comision, grupo: al.grupo, companeros: comp },
    reglas: {
      minutos: Number(cfg.minutos_sugeridos) || 10,
      minimoCorrectas: Number(cfg.minimo_correctas) || 2,
      promocion: Number(cfg.aprobados_promocion) || 8,
      regular: Number(cfg.aprobados_regular) || 5,
      excedidoDesaprueba: String(cfg.excedido_desaprueba).toUpperCase() === 'SI',
      cuatrimestre: cfg.cuatrimestre
    },
    caso: desproteger_(cfg.caso_tp || ''),
    cronograma: cronograma_(),
    entregasTP: entregasTP_(),
    progreso: progresoAlumno_(al.legajo),
    ahora: Date.now()
  };
}

/** Abre una parte de un checkpoint. No escribe en la planilla: guarda la hora de inicio en caché. */
function comenzar_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const clase = String(p.clase), parte = parteValida_(p.parte);
  if (!parte) return { ok: false, error: 'datos' };
  const c = claseAbierta_(clase);
  if (!c.ok) return c;
  if (progresoAlumno_(s.l)[clase + '|' + parte]) return { ok: false, error: 'ya_entregado' };

  const cache = CacheService.getScriptCache();
  const k = 'ini|' + s.l + '|' + clase + '|' + parte;
  let inicio = Number(cache.get(k)) || 0;
  if (!inicio) { inicio = Date.now(); cache.put(k, String(inicio), CFG.TTL_CACHE); }

  const preguntas = (preguntas_()[clase + '|' + parte] || []).map(function (q) {
    return { n: q.n, tipo: q.tipo, enunciado: q.enunciado, opciones: q.opciones };   // sin la respuesta correcta
  });
  const extra = parte === 'capsula' ? { capsula: { titulo: c.clase.capsula_titulo, url: c.clase.capsula_url } } : {};
  return Object.assign({ ok: true, inicio: inicio, ahora: Date.now(), preguntas: preguntas }, extra);
}

/** Corrige en el servidor, registra la duración y deja una fila en Intentos. Un solo intento por parte. */
function entregar_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const clase = String(p.clase), parte = parteValida_(p.parte);
  if (!parte) return { ok: false, error: 'datos' };
  const c = claseAbierta_(clase);
  if (!c.ok) return c;
  const al = padron_()[s.l];

  const cfg = config_();
  const qs = preguntas_()[clase + '|' + parte] || [];
  const resp = (p.respuestas && typeof p.respuestas === 'object') ? p.respuestas : {};
  let correctas = 0, respondidas = 0;
  qs.forEach(function (q) {
    const r = resp[q.n];
    if (r !== undefined && r !== null && String(r).trim() !== '') respondidas++;
    if (q.tipo === 'opcion' && String(r) === String(q.correcta)) correctas++;
  });
  const cerradas = qs.filter(function (q) { return q.tipo === 'opcion'; }).length;

  const cache = CacheService.getScriptCache();
  const inicio = Number(cache.get('ini|' + s.l + '|' + clase + '|' + parte)) || Number(p.inicio) || Date.now();
  const segundos = Math.max(0, Math.round((Date.now() - inicio) / 1000));
  const limite = (Number(cfg.minutos_sugeridos) || 10) * 60;
  const excedido = segundos > limite;

  let aprobado;
  if (parte === 'teorico') aprobado = correctas >= Math.min(Number(cfg.minimo_correctas) || 2, cerradas || 0);
  else aprobado = respondidas >= qs.length;            // cápsula: se aprueba al entregar completa
  if (excedido && String(cfg.excedido_desaprueba).toUpperCase() === 'SI') aprobado = false;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.ESPERA_BLOQUEO_MS)) return { ok: false, error: 'ocupado' };
  try {
    const prog = progresoAlumno_(s.l);
    if (prog[clase + '|' + parte]) return { ok: false, error: 'ya_entregado' };
    const respTxt = JSON.stringify(resp).slice(0, CFG.MAX_CARACTERES);
    const h = hoja_('Intentos');
    h.getRange(h.getLastRow() + 1, 1, 1, 13).setValues([[
      new Date(), s.l, clase, parte, new Date(inicio), segundos, excedido ? 'SI' : 'NO',
      correctas, cerradas, aprobado ? 'SI' : 'NO', proteger_(respTxt), al.comision, al.grupo
    ]]);
    SpreadsheetApp.flush();
    prog[clase + '|' + parte] = { a: aprobado, s: segundos, x: excedido, c: correctas, t: cerradas };
    guardarJson_('prog|' + s.l, prog, CFG.TTL_CACHE);
  } finally {
    lock.releaseLock();
  }
  cache.remove('ini|' + s.l + '|' + clase + '|' + parte);
  return { ok: true, aprobado: aprobado, correctas: correctas, total: cerradas, segundos: segundos, excedido: excedido };
}

/** Progreso de un alumno: {"clase|parte": {a,s,x,c,t}}. Sale de caché; si no está, busca sólo sus filas. */
function progresoAlumno_(legajo, forzarHoja) {
  if (!forzarHoja) {
    const c = leerJson_('prog|' + legajo);
    if (c) return c;
  }
  const h = hoja_('Intentos');
  const out = {};
  if (h.getLastRow() > 1) {
    const celdas = h.getRange(2, 2, h.getLastRow() - 1, 1).createTextFinder(legajo).matchEntireCell(true).findAll();
    celdas.forEach(function (cel) {
      const f = h.getRange(cel.getRow(), 1, 1, 10).getValues()[0];
      out[String(f[2]) + '|' + String(f[3])] = { a: f[9] === 'SI', s: Number(f[5]), x: f[6] === 'SI', c: Number(f[7]), t: Number(f[8]) };
    });
  }
  guardarJson_('prog|' + legajo, out, CFG.TTL_CACHE);
  return out;
}

function claseAbierta_(clase) {
  const c = cronograma_().filter(function (x) { return String(x.clase) === clase && x.tiene_checkpoint; })[0];
  if (!c) return { ok: false, error: 'clase' };
  const ahora = Date.now();
  if (ahora < c.abre) return { ok: false, error: 'no_abierta' };
  if (ahora > c.cierra) return { ok: false, error: 'cerrada' };
  return { ok: true, clase: c };
}

/* =========================================================
   TRABAJO PRÁCTICO GRUPAL (secuencial, edición colaborativa)
   ========================================================= */

function tpLeer_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const al = padron_()[s.l];
  if (!al.grupo) return { ok: false, error: 'sin_grupo' };
  return { ok: true, grupo: al.grupo, campos: camposGrupo_(al.grupo), version: versionGrupo_(al.grupo), nota: notaGrupo_(al.grupo) };
}

/** Consulta liviana para saber si alguien del grupo guardó algo. Sólo lee caché. */
function tpVersion_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const al = padron_()[s.l];
  return { ok: true, version: versionGrupo_(al.grupo) };
}

function tpGuardar_(p) {
  const s = sesion_(p, 'al');
  if (!s) return { ok: false, error: 'sesion' };
  const al = padron_()[s.l];
  if (!al.grupo) return { ok: false, error: 'sin_grupo' };
  const grupo = al.grupo;
  const autor = (al.nombre + ' ' + al.apellido).trim();
  const cambios = Array.isArray(p.cambios) ? p.cambios.slice(0, CFG.MAX_CAMBIOS) : [];
  if (!cambios.length) return { ok: true, guardados: {}, conflictos: [] };

  const actuales = camposGrupo_(grupo);
  if (actuales._final && actuales._final.v) return { ok: false, error: 'final' };

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.ESPERA_BLOQUEO_MS)) return { ok: false, error: 'ocupado' };
  try {
    const h = hoja_('TP');
    const idx = indiceTP_();
    const guardados = {}, conflictos = [], nuevas = [], historial = [];
    const ahora = new Date();
    cambios.forEach(function (c) {
      const campo = String(c.campo || '');
      if (!/^[a-zA-Z0-9_.\-]{1,40}$/.test(campo)) return;
      const valor = String(c.valor == null ? '' : c.valor);
      if (valor.length > CFG.MAX_CARACTERES) { conflictos.push({ campo: campo, error: 'largo' }); return; }
      const ex = actuales[campo];
      const base = Number(c.base) || 0;
      if (ex && ex.t > base && ex.a !== autor && !c.forzar && ex.v !== valor) {
        conflictos.push({ campo: campo, v: ex.v, a: ex.a, t: ex.t });
        return;
      }
      const ts = Math.max(Date.now(), ex ? ex.t + 1 : 0);
      const clave = grupo + '|' + campo;
      const fila = [clave, grupo, campo, proteger_(valor), autor, ts];
      if (idx[clave]) h.getRange(idx[clave], 1, 1, 6).setValues([fila]);
      else nuevas.push(fila);
      actuales[campo] = { v: valor, a: autor, t: ts };
      guardados[campo] = ts;
      historial.push([ahora, grupo, campo, autor, proteger_(valor.slice(0, 5000))]);
    });
    if (nuevas.length) {
      const desde = h.getLastRow() + 1;
      h.getRange(desde, 1, nuevas.length, 6).setValues(nuevas);
      nuevas.forEach(function (f, i) { idx[f[0]] = desde + i; });
      guardarJson_('idxTP', idx, CFG.TTL_CACHE);
    }
    if (historial.length) {
      const hh = hoja_('TPHistorial');
      hh.getRange(hh.getLastRow() + 1, 1, historial.length, 5).setValues(historial);
    }
    SpreadsheetApp.flush();
    guardarJson_('tp|' + grupo, actuales, CFG.TTL_CACHE);
    if (Object.keys(guardados).length) CacheService.getScriptCache().put('tpv|' + grupo, String(Date.now()), CFG.TTL_CACHE);
    return { ok: true, guardados: guardados, conflictos: conflictos, version: versionGrupo_(grupo) };
  } finally {
    lock.releaseLock();
  }
}

function camposGrupo_(grupo) {
  const c = leerJson_('tp|' + grupo);
  if (c) return c;
  const h = hoja_('TP');
  const out = {};
  if (h.getLastRow() > 1) {
    const celdas = h.getRange(2, 2, h.getLastRow() - 1, 1).createTextFinder(String(grupo)).matchEntireCell(true).findAll();
    celdas.forEach(function (cel) {
      const f = h.getRange(cel.getRow(), 1, 1, 6).getValues()[0];
      out[String(f[2])] = { v: desproteger_(f[3]), a: String(f[4]), t: Number(f[5]) || 0 };
    });
  }
  guardarJson_('tp|' + grupo, out, CFG.TTL_CACHE);
  return out;
}

function indiceTP_() {
  const c = leerJson_('idxTP');
  if (c) return c;
  const h = hoja_('TP');
  const idx = {};
  if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 1).getValues().forEach(function (f, i) { idx[String(f[0])] = i + 2; });
  guardarJson_('idxTP', idx, CFG.TTL_CACHE);
  return idx;
}

function versionGrupo_(grupo) {
  return Number(CacheService.getScriptCache().get('tpv|' + grupo)) || 0;
}

function notaGrupo_(grupo) {
  const n = notas_()[grupo];
  return n ? { nota: n.nota, comentario: n.comentario } : null;
}

/* =========================================================
   DOCENTES (Marina, Lina y equipo de TP ven toda la cátedra)
   ========================================================= */

function docIngresar_(p) {
  const d = docentes_()[norm_(p.mail)];
  if (!d || String(d.clave) !== String(p.clave || '')) return { ok: false, error: 'acceso' };
  const token = firmar_({ r: 'doc', m: d.mail, x: Date.now() + 12 * 3600e3 });
  return { ok: true, token: token, yo: { nombre: d.nombre, rol: d.rol } };
}

/** Todo lo que necesita el tablero, en un solo pedido. Se cachea 60 s para que 10 docentes no multipliquen la carga. */
function docResumen_(p) {
  const s = sesion_(p, 'doc');
  if (!s) return { ok: false, error: 'sesion' };
  if (!p.fresco) {
    const c = leerJson_('resumen');
    if (c) return c;
  }
  const pad = padron_();
  const alumnos = Object.keys(pad).map(function (k) {
    const a = pad[k];
    return [a.legajo, a.apellido, a.nombre, a.comision, a.grupo, a.mail];
  });
  const h = hoja_('Intentos');
  const intentos = h.getLastRow() > 1
    ? h.getRange(2, 1, h.getLastRow() - 1, 10).getValues().map(function (f) {
        return [String(f[1]), String(f[2]), String(f[3]), f[9] === 'SI' ? 1 : 0, Number(f[5]), f[6] === 'SI' ? 1 : 0, Number(f[7]), Number(f[8]), new Date(f[0]).getTime()];
      })
    : [];
  const ht = hoja_('TP');
  const tp = {};
  if (ht.getLastRow() > 1) ht.getRange(2, 2, ht.getLastRow() - 1, 5).getValues().forEach(function (f) {
    const g = String(f[0]);
    tp[g] = tp[g] || {};
    tp[g][String(f[1])] = { t: Number(f[4]) || 0, n: desproteger_(f[2]).length };   // sin el texto: liviano
  });
  const out = {
    ok: true, generado: Date.now(),
    alumnos: alumnos, intentos: intentos, tp: tp, notas: notas_(),
    cronograma: cronograma_(), entregasTP: entregasTP_(),
    reglas: estadoReglas_()
  };
  guardarJson_('resumen', out, CFG.TTL_RESUMEN);
  return out;
}

function docTP_(p) {
  const s = sesion_(p, 'doc');
  if (!s) return { ok: false, error: 'sesion' };
  const g = String(p.grupo || '');
  const integrantes = Object.keys(padron_()).map(function (k) { return padron_()[k]; })
    .filter(function (a) { return a.grupo === g; })
    .map(function (a) { return a.nombre + ' ' + a.apellido + ' (' + a.legajo + ')'; });
  return { ok: true, grupo: g, integrantes: integrantes, campos: camposGrupo_(g), nota: notaGrupo_(g) };
}

function docNota_(p) {
  const s = sesion_(p, 'doc');
  if (!s) return { ok: false, error: 'sesion' };
  const g = String(p.grupo || '');
  const nota = p.nota === '' || p.nota == null ? '' : Number(p.nota);
  if (nota !== '' && !(nota >= 1 && nota <= 10)) return { ok: false, error: 'nota' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.ESPERA_BLOQUEO_MS)) return { ok: false, error: 'ocupado' };
  try {
    const h = hoja_('Notas');
    const fila = [g, nota, String(p.comentario || '').slice(0, 2000), docentes_()[s.m].nombre, new Date()];
    const cel = h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, 1).createTextFinder(g).matchEntireCell(true).findNext() : null;
    if (cel) h.getRange(cel.getRow(), 1, 1, 5).setValues([fila]);
    else h.getRange(h.getLastRow() + 1, 1, 1, 5).setValues([fila]);
    SpreadsheetApp.flush();
    CacheService.getScriptCache().removeAll(['notas#n', 'resumen#n']);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/* =========================================================
   PRUEBA DE CARGA (sólo con prueba_carga = SI en Config)
   Simula exactamente el costo de una entrega: fila nueva bajo bloqueo + lectura de caché.
   ========================================================= */

function carga_(p) {
  if (String(config_().prueba_carga).toUpperCase() !== 'SI') return { ok: false, error: 'deshabilitado' };
  const t0 = Date.now();
  const quien = String(p.quien || '').slice(0, 40);
  if (p.tipo === 'leer') {
    leerJson_('prog|' + quien);
    cronograma_();
    return { ok: true, ms: Date.now() - t0 };
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(CFG.ESPERA_BLOQUEO_MS)) return { ok: false, error: 'ocupado', ms: Date.now() - t0 };
  let enBloqueo;
  try {
    const t1 = Date.now();
    const h = hoja_('Carga');
    h.getRange(h.getLastRow() + 1, 1, 1, 3).setValues([[new Date(), quien, String(p.dato || '').slice(0, 500)]]);
    SpreadsheetApp.flush();
    enBloqueo = Date.now() - t1;
  } finally {
    lock.releaseLock();
  }
  return { ok: true, ms: Date.now() - t0, bloqueo: enBloqueo };
}

/* =========================================================
   LECTURA DE CONFIGURACIÓN (cacheada)
   ========================================================= */

function config_() {
  return cacheado_('cfg', function () {
    const h = hoja_('Config');
    const o = {};
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach(function (f) { o[String(f[0])] = f[1]; });
    return o;
  });
}

function estadoReglas_() {
  const c = config_();
  return { minutos: Number(c.minutos_sugeridos) || 10, promocion: Number(c.aprobados_promocion) || 8, regular: Number(c.aprobados_regular) || 5 };
}

/** Cronograma: abre y cierra en milisegundos. Si "cierra" está vacío, se calcula: fin de la unidad + dias_cierre. */
function cronograma_() {
  return cacheado_('crono', function () {
    const h = hoja_('Cronograma');
    if (h.getLastRow() < 2) return [];
    const dias = Number(config_().dias_cierre) || 15;
    const filas = h.getRange(2, 1, h.getLastRow() - 1, 9).getValues().filter(function (f) { return f[0] !== ''; });
    const finUnidad = {};
    filas.forEach(function (f) {
      const u = String(f[2]), t = fecha_(f[1]);
      if (u && t && (!finUnidad[u] || t > finUnidad[u])) finUnidad[u] = t;
    });
    return filas.map(function (f) {
      const fecha = fecha_(f[1]);
      const abre = fecha_(f[4]) || fecha;
      const cierra = fecha_(f[5]) || (finUnidad[String(f[2])] ? finUnidad[String(f[2])] + (dias + 1) * 864e5 - 1 : null);
      return {
        clase: String(f[0]), fecha: fecha, unidad: String(f[2]), tema: String(f[3]),
        abre: abre, cierra: cierra, tiene_checkpoint: String(f[6]).toUpperCase() === 'SI',
        capsula_titulo: String(f[7] || ''), capsula_url: String(f[8] || '')
      };
    });
  });
}

function preguntas_() {
  return cacheado_('preg', function () {
    const h = hoja_('Preguntas');
    const o = {};
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 7).getValues().forEach(function (f) {
      if (f[0] === '') return;
      const k = String(f[0]) + '|' + String(f[1]).toLowerCase();
      (o[k] = o[k] || []).push({
        n: String(f[2]), tipo: String(f[3]).toLowerCase() === 'abierta' ? 'abierta' : 'opcion',
        enunciado: desproteger_(f[4]),
        opciones: String(f[5] || '') ? desproteger_(f[5]).split('|').map(function (x) { return x.trim(); }) : [],
        correcta: String(f[6])
      });
    });
    return o;
  });
}

function entregasTP_() {
  return cacheado_('entTP', function () {
    const h = hoja_('EntregasTP');
    if (h.getLastRow() < 2) return [];
    return h.getRange(2, 1, h.getLastRow() - 1, 6).getValues().filter(function (f) { return f[0] !== ''; }).map(function (f) {
      return { entrega: String(f[0]), clase: String(f[1]), titulo: String(f[2]), consigna: desproteger_(f[3]), abre: fecha_(f[4]), vence: fecha_(f[5]) };
    });
  });
}

function padron_() {
  if (padron_.m) return padron_.m;      // memo dentro de la misma ejecución
  padron_.m = cacheado_('padron', function () {
    const h = hoja_('Padron');
    const o = {};
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 7).getValues().forEach(function (f) {
      const l = normLegajo_(f[0]);
      if (!l) return;
      o[l] = { legajo: l, dni: soloDigitos_(f[1]), mail: norm_(f[2]), apellido: String(f[3]).trim(), nombre: String(f[4]).trim(), comision: String(f[5]).trim(), grupo: String(f[6]).trim() };
    });
    return o;
  });
  return padron_.m;
}

function docentes_() {
  return cacheado_('docentes', function () {
    const h = hoja_('Docentes');
    const o = {};
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().forEach(function (f) {
      if (f[0]) o[norm_(f[0])] = { mail: norm_(f[0]), nombre: String(f[1]), rol: String(f[2]), clave: String(f[3]) };
    });
    return o;
  });
}

function notas_() {
  return cacheado_('notas', function () {
    const h = hoja_('Notas');
    const o = {};
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 5).getValues().forEach(function (f) {
      o[String(f[0])] = { nota: f[1], comentario: String(f[2]), docente: String(f[3]), ts: f[4] ? new Date(f[4]).getTime() : 0 };
    });
    return o;
  });
}

/* =========================================================
   SESIONES FIRMADAS
   ========================================================= */

function secreto_() {
  const s = String(config_().secreto || '');
  if (!s) throw new Error('Falta el secreto. Ejecutá configurarBitacora().');
  return s;
}

function firmar_(obj) {
  const cuerpo = Utilities.base64EncodeWebSafe(JSON.stringify(obj));
  const firma = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(cuerpo, secreto_()));
  return cuerpo + '.' + firma;
}

function sesion_(p, rol) {
  const t = String(p.token || '');
  const i = t.indexOf('.');
  if (i < 1) return null;
  const cuerpo = t.slice(0, i), firma = t.slice(i + 1);
  const esperada = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(cuerpo, secreto_()));
  if (firma !== esperada) return null;
  let o;
  try { o = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(cuerpo)).getDataAsString()); } catch (e) { return null; }
  if (!o || o.r !== rol || !(o.x > Date.now())) return null;
  if (rol === 'al' && !padron_()[o.l]) return null;
  if (rol === 'doc' && !docentes_()[o.m]) return null;
  return o;
}

/* =========================================================
   CACHÉ (valores grandes partidos en trozos de 90 KB)
   ========================================================= */

function cacheado_(clave, fn) {
  const c = leerJson_(clave);
  if (c !== null) return c;
  const v = fn();
  guardarJson_(clave, v, CFG.TTL_CACHE);
  return v;
}

function guardarJson_(clave, obj, ttl) {
  const cache = CacheService.getScriptCache();
  const s = JSON.stringify(obj);
  const TROZO = 90000;
  const n = Math.max(1, Math.ceil(s.length / TROZO));
  const pares = { };
  pares[clave + '#n'] = String(n);
  for (let i = 0; i < n; i++) pares[clave + '#' + i] = s.slice(i * TROZO, (i + 1) * TROZO);
  try { cache.putAll(pares, ttl); } catch (e) { console.warn('cache ' + clave + ': ' + e); }
}

function leerJson_(clave) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(clave + '#n'));
  if (!n) return null;
  const claves = [];
  for (let i = 0; i < n; i++) claves.push(clave + '#' + i);
  const partes = cache.getAll(claves);
  let s = '';
  for (let i = 0; i < n; i++) {
    if (partes[claves[i]] == null) return null;
    s += partes[claves[i]];
  }
  try { return JSON.parse(s); } catch (e) { return null; }
}

/* =========================================================
   AUXILIARES
   ========================================================= */

function parteValida_(p) { p = String(p || '').toLowerCase(); return p === 'teorico' || p === 'capsula' ? p : null; }
function norm_(v) { return String(v || '').trim().toLowerCase(); }
function normLegajo_(v) { return String(v || '').trim().toUpperCase().replace(/\s+/g, ''); }
function soloDigitos_(v) { return String(v || '').replace(/\D/g, ''); }
function fecha_(v) {
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  const m = String(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/)
    || String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const iso = m[1].length === 4;
  const y = Number(iso ? m[1] : m[3]), mo = Number(m[2]) - 1, d = Number(iso ? m[3] : m[1]);
  return new Date(y, mo, d, Number(m[4] || 0), Number(m[5] || 0)).getTime();   // hora local del script
}
function proteger_(v) { return CFG.PROTECCION + String(v); }
function desproteger_(v) {
  const s = String(v == null ? '' : v);
  return s.charAt(0) === CFG.PROTECCION ? s.slice(1) : s;
}
function crearHoja_(ss, nombre, enc) {
  let h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}
function hoja_(n) {
  const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);
  if (!h) throw new Error('Falta la hoja ' + n + '. Ejecutá configurarBitacora().');
  return h;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
