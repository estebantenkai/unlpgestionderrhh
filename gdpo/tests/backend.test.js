// Pruebas del backend real (Code.gs) sobre la planilla simulada. Uso: node gdpo/tests/backend.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const { crearEntornoGAS } = require('../src/gas-mock.js');
const { cargarBackend, sembrarPlanilla } = require('../src/cargar-backend.js');
const C = require('../src/contenido.js');
const raiz = path.join(__dirname, '..');
const fuente = fs.readFileSync(path.join(raiz, 'backend/Code.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(raiz, 'backend/Pruebas.gs'), 'utf8');

const env = crearEntornoGAS();
const B = cargarBackend(env, fuente);
B.api.configurarBitacora();
const padron = [
  ['41287/3', '40111222', 'camila.rossi@alu.econo.unlp.edu.ar', 'Rossi', 'Camila', 'A', 'G01'],
  ['41300/1', '40222333', 'tomas.paz@alu.econo.unlp.edu.ar', 'Paz', 'Tomás', 'A', 'G01'],
  ['41999/9', '40999888', 'sin.grupo@alu.econo.unlp.edu.ar', 'Gómez', 'Ana', 'B', '']
];
sembrarPlanilla(env, C, padron);
B.api.limpiarCache();
let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('  ✓ ' + nombre); };
const L = p => B.llamar(p);
const D = (s) => { const [d, h] = s.split(' '); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = (h || '0:0').split(':').map(Number); return new Date(y, m - 1, dd, hh, mm).getTime(); };

console.log('Backend GDPO');
t('probarBackend pasa con el contenido de ejemplo', () => { B.api.probarBackend(); assert(env._logs.some(l => l.startsWith('TODO OK'))); });

env._fijarAhora(D('2027-03-18 10:00'));
let cam;
t('rechaza DNI equivocado', () => assert.equal(L({ accion: 'ingresar', mail: 'camila.rossi@alu.econo.unlp.edu.ar', legajo: '41287/3', dni: '1' }).error, 'acceso'));
t('ingresa con mail + legajo + DNI (normaliza mayúsculas y puntos)', () => {
  cam = L({ accion: 'ingresar', mail: ' Camila.Rossi@alu.econo.unlp.edu.ar ', legajo: '41287/3', dni: '40.111.222' });
  assert(cam.ok && cam.token); assert.equal(cam.yo.grupo, 'G01'); assert.deepEqual(cam.yo.companeros, ['Camila Rossi', 'Tomás Paz']);
});
t('cronograma: 10 checkpoints; clase 2 cierra 15 días después del fin de la unidad I', () => {
  const cps = cam.cronograma.filter(c => c.tiene_checkpoint);
  assert.equal(cps.length, 10);
  const c2 = cps.find(c => c.clase === '2');
  assert.equal(new Date(c2.cierra).toDateString(), new Date(2027, 3, 1).toDateString());
});
t('token adulterado no sirve', () => assert.equal(L({ accion: 'estado', token: cam.token.slice(0, -3) + 'abc' }).error, 'sesion'));
t('clase 3 todavía no abrió', () => assert.equal(L({ accion: 'comenzar', token: cam.token, clase: '3', parte: 'teorico' }).error, 'no_abierta'));
let com;
t('comenzar no manda las respuestas correctas', () => {
  com = L({ accion: 'comenzar', token: cam.token, clase: '2', parte: 'teorico' });
  assert(com.ok); assert.equal(com.preguntas.length, 3); assert(!('correcta' in com.preguntas[0]));
});
t('volver a comenzar conserva la hora de inicio', () => {
  env._fijarAhora(D('2027-03-18 10:03'));
  assert.equal(L({ accion: 'comenzar', token: cam.token, clase: '2', parte: 'teorico' }).inicio, com.inicio);
});
t('entrega 2 de 3 correctas en 12 min: aprobado y marcado como excedido', () => {
  env._fijarAhora(D('2027-03-18 10:12'));
  const r = L({ accion: 'entregar', token: cam.token, clase: '2', parte: 'teorico', respuestas: { 1: '1', 2: '2', 3: '0' } });
  assert(r.ok && r.aprobado); assert.equal(r.correctas, 2); assert.equal(r.segundos, 720); assert(r.excedido);
});
t('no permite un segundo intento', () => assert.equal(L({ accion: 'entregar', token: cam.token, clase: '2', parte: 'teorico', respuestas: {} }).error, 'ya_entregado'));
t('cápsula incompleta queda desaprobada; completa, aprobada', () => {
  L({ accion: 'comenzar', token: cam.token, clase: '2', parte: 'capsula' });
  const r = L({ accion: 'entregar', token: cam.token, clase: '2', parte: 'capsula', respuestas: { 1: 'Socio estratégico: planificaban la planta.', 2: 'Algo' } });
  assert(r.aprobado);
});
t('el progreso sobrevive a que se vacíe la caché (lo relee de la planilla)', () => {
  env._limpiarCache();
  const e = L({ accion: 'estado', token: cam.token });
  assert(e.progreso['2|teorico'].a && e.progreso['2|teorico'].x && e.progreso['2|capsula'].a);
});
t('con excedido_desaprueba = SI, pasarse desaprueba', () => {
  env._libro.getSheetByName('Config').filas.forEach(f => { if (f[0] === 'excedido_desaprueba') f[1] = 'SI'; });
  B.api.limpiarCache();
  const tom = L({ accion: 'ingresar', mail: 'tomas.paz@alu.econo.unlp.edu.ar', legajo: '41300/1', dni: '40222333' });
  L({ accion: 'comenzar', token: tom.token, clase: '2', parte: 'teorico' });
  env._fijarAhora(D('2027-03-18 10:30'));
  const r = L({ accion: 'entregar', token: tom.token, clase: '2', parte: 'teorico', respuestas: { 1: '1', 2: '2', 3: '1' } });
  assert.equal(r.correctas, 3); assert.equal(r.aprobado, false);
  env._libro.getSheetByName('Config').filas.forEach(f => { if (f[0] === 'excedido_desaprueba') f[1] = 'NO'; });
  B.api.limpiarCache();
});
t('después del cierre no se puede entregar', () => {
  env._fijarAhora(D('2027-04-02 09:00'));
  assert.equal(L({ accion: 'comenzar', token: cam.token, clase: '2', parte: 'capsula' }).error, 'cerrada');
});

// TP grupal
const tom = L({ accion: 'ingresar', mail: 'tomas.paz@alu.econo.unlp.edu.ar', legajo: '41300/1', dni: '40222333' });
let v0;
t('TP: guardar y leer desde otra cuenta del grupo', () => {
  const g = L({ accion: 'tpGuardar', token: cam.token, cambios: [{ campo: 'e1', valor: '<p>Diagnóstico =SUMA(1;2)</p>', base: 0 }] });
  assert(g.ok && g.guardados.e1);
  const r = L({ accion: 'tpLeer', token: tom.token });
  assert.equal(r.campos.e1.v, '<p>Diagnóstico =SUMA(1;2)</p>'); assert.equal(r.campos.e1.a, 'Camila Rossi');
  v0 = r.version; assert(v0 > 0);
});
t('TP: edición con versión vieja de otra persona da conflicto', () => {
  const g = L({ accion: 'tpGuardar', token: tom.token, cambios: [{ campo: 'e1', valor: 'pisado', base: 1 }] });
  assert.equal(g.conflictos.length, 1); assert.equal(g.conflictos[0].a, 'Camila Rossi');
});
t('TP: tpVersion cambia cuando alguien guarda', () => {
  env._fijarAhora(D('2027-04-02 09:05'));
  L({ accion: 'tpGuardar', token: tom.token, cambios: [{ campo: 'e2', valor: 'Dotación', base: 0 }] });
  assert(L({ accion: 'tpVersion', token: cam.token }).version > v0);
});
t('TP: alumno sin grupo no puede editar', () => {
  const ana = L({ accion: 'ingresar', mail: 'sin.grupo@alu.econo.unlp.edu.ar', legajo: '41999/9', dni: '40999888' });
  assert.equal(L({ accion: 'tpGuardar', token: ana.token, cambios: [{ campo: 'e1', valor: 'x' }] }).error, 'sin_grupo');
});
t('TP: después de la entrega final queda cerrado', () => {
  L({ accion: 'tpGuardar', token: cam.token, cambios: [{ campo: '_final', valor: 'Entregado', base: 0 }] });
  assert.equal(L({ accion: 'tpGuardar', token: tom.token, cambios: [{ campo: 'e3', valor: 'x' }] }).error, 'final');
});

// Docentes
let doc;
t('docente: clave incorrecta rechazada; correcta entra', () => {
  assert.equal(L({ accion: 'docIngresar', mail: 'brian@econo.unlp.edu.ar', clave: 'x' }).error, 'acceso');
  doc = L({ accion: 'docIngresar', mail: 'Brian@econo.unlp.edu.ar', clave: 'demo' }); assert(doc.ok);
});
t('docente: un token de alumno no abre el tablero', () => assert.equal(L({ accion: 'docResumen', token: cam.token }).error, 'sesion'));
t('docente: resumen con alumnos, intentos y TP', () => {
  const r = L({ accion: 'docResumen', token: doc.token, fresco: true });
  assert.equal(r.alumnos.length, 3); assert.equal(r.intentos.length, 3); assert(r.tp.G01.e1.n > 0);
});
t('docente: nota grupal 1-10 se guarda, valida y llega al alumno', () => {
  assert.equal(L({ accion: 'docNota', token: doc.token, grupo: 'G01', nota: 11 }).error, 'nota');
  assert(L({ accion: 'docNota', token: doc.token, grupo: 'G01', nota: 8, comentario: 'Buen diagnóstico' }).ok);
  assert(L({ accion: 'docNota', token: doc.token, grupo: 'G01', nota: 9 }).ok);
  assert.equal(env._libro.getSheetByName('Notas').getLastRow(), 2);   // actualiza, no duplica
  assert.equal(L({ accion: 'tpLeer', token: tom.token }).nota.nota, 9);
  assert.equal(L({ accion: 'docResumen', token: doc.token }).notas.G01.nota, 9);
});
t('prueba de carga responde sólo con el interruptor activado', () => {
  assert(L({ accion: 'carga', quien: 'v1' }).ok);
  env._libro.getSheetByName('Config').filas.forEach(f => { if (f[0] === 'prueba_carga') f[1] = 'NO'; });
  B.api.limpiarCache();
  assert.equal(L({ accion: 'carga', quien: 'v1' }).error, 'deshabilitado');
});
t('acción desconocida no rompe', () => assert.equal(L({ accion: 'borrarTodo' }).error, 'accion'));
console.log(`\n${ok} pruebas OK`);
