/*
 * MODO DEMO: corre el backend real (Code.gs) en el navegador sobre una planilla simulada
 * con 150 alumnos ficticios en 30 grupos y su avance según la fecha elegida.
 * Necesita: crearEntornoGAS, cargarBackend, sembrarPlanilla, CONTENIDO y CODIGO_BACKEND.
 */
(function () {
  if (window.API) return;     // con backend real no se carga la demo
  var NOMBRES = ['Camila', 'Tomás', 'Valentina', 'Mateo', 'Sofía', 'Joaquín', 'Martina', 'Benjamín', 'Lucía', 'Santiago', 'Julieta', 'Felipe', 'Agustina', 'Bautista', 'Catalina', 'Facundo', 'Abril', 'Nicolás', 'Florencia', 'Ignacio', 'Micaela', 'Franco', 'Rocío', 'Lautaro', 'Paula', 'Gonzalo', 'Milagros', 'Tobías', 'Candela', 'Ramiro', 'Delfina', 'Lisandro', 'Malena', 'Iván', 'Pilar', 'Juan Cruz', 'Morena', 'Emiliano', 'Victoria', 'Thiago'];
  var APELLIDOS = ['Rossi', 'Paz', 'Fernández', 'Gómez', 'Martínez', 'López', 'Díaz', 'Pérez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre', 'Giménez', 'Molina', 'Castro', 'Ortiz', 'Silva', 'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Ferreyra', 'Godoy', 'Morales', 'Domínguez', 'Quiroga', 'Peralta', 'Vega', 'Carrizo', 'Ledesma', 'Bustos'];
  var TEXTOS = [
    'Hoy el área funciona sobre todo como experta administrativa: liquida sueldos, controla ausentismo y cubre vacantes cuando la línea lo pide. Para la planta nueva necesita sumar el rol de socio estratégico, sentándose en la mesa del proyecto desde el diseño.',
    'Estimamos una dotación de 120 personas: 96 operarios, 12 supervisores, 6 administrativos y 6 de mantenimiento. Con una rotación del 22 %, la demanda real del primer año es de unas 146 incorporaciones.',
    'El puesto existe para asegurar que el turno cumpla el plan de producción con calidad y seguridad, coordinando a un equipo de 8 a 10 operarios. Responde al jefe de planta.',
    'Proponemos tres etapas: preselección por formulario con preguntas situacionales, entrevista por competencias con el jefe de planta y una prueba práctica en línea de producción.',
    'Evaluaremos resultados del turno (40 %), conducción del equipo (40 %) y seguridad (20 %). Para reducir el sesgo de recencia, el supervisor llevará un registro mensual de hechos.',
    'Detectamos tres necesidades: buenas prácticas de manufactura, conducción de equipos para supervisores nuevos y uso del nuevo sistema de planificación.'
  ];
  var CODIGO = window.CODIGO_BACKEND;
  var C = window.CONTENIDO;
  var env, B;
  var demo = { alumnoDemo: { mail: 'camila.rossi@alu.econo.unlp.edu.ar', legajo: '41287/3', dni: '40111222' } };

  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
  function local(s) { var p = s.split(/[- :]/).map(Number); return new Date(p[0], p[1] - 1, p[2], p[3] || 0, p[4] || 0).getTime(); }

  function padron() {
    var r = rnd(7), filas = [], usados = {};
    for (var i = 0; i < 150; i++) {
      var g = 'G' + String(Math.floor(i / 5) + 1).padStart(2, '0');
      var com = i < 50 ? 'A' : i < 100 ? 'B' : 'C';
      var nom, ape;
      if (i === 30) { nom = 'Camila'; ape = 'Rossi'; }
      else if (i === 31) { nom = 'Tomás'; ape = 'Paz'; }
      else { do { nom = NOMBRES[Math.floor(r() * NOMBRES.length)]; ape = APELLIDOS[Math.floor(r() * APELLIDOS.length)]; } while (usados[nom + ape]); }
      usados[nom + ape] = 1;
      var leg = i === 30 ? '41287/3' : (40000 + Math.floor(r() * 9000)) + '/' + Math.floor(1 + r() * 8);
      var dni = i === 30 ? '40111222' : String(39000000 + Math.floor(r() * 6000000));
      var mail = i === 30 ? demo.alumnoDemo.mail : (nom + '.' + ape).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '') + i + '@alu.econo.unlp.edu.ar';
      filas.push([leg, dni, mail, ape, nom, com, g]);
    }
    return filas;
  }

  function simular(ahora, pad) {
    var r = rnd(11), L = env._libro;
    var cps = C.cronograma.filter(function (c) { return c[6] === 'SI'; });
    // fin de unidad para calcular cierres igual que el backend
    var finU = {}; C.cronograma.forEach(function (c) { if (c[2]) { var t = local(c[1]); if (!finU[c[2]] || t > finU[c[2]]) finU[c[2]] = t; } });
    var intentos = [];
    pad.forEach(function (a, i) {
      var esDemo = a[0] === demo.alumnoDemo.legajo;
      var empeño = esDemo ? 0.97 : 0.7 + r() * 0.29;
      cps.forEach(function (c) {
        var abre = local(c[4]), cierra = finU[c[2]] + 16 * 864e5 - 1;
        if (ahora < abre) return;
        var tope = Math.min(ahora, cierra);
        var avance = ahora >= cierra ? 1 : Math.min(1, (ahora - abre) / (6 * 864e5));
        if (esDemo && ahora < cierra) return;            // lo abierto queda para probarlo en la demo
        ['teorico', 'capsula'].forEach(function (parte) {
          if (r() > empeño * (0.35 + 0.65 * avance)) return;
          var ts = abre + r() * (tope - abre) * 0.9;
          var seg = Math.round(Math.exp(Math.log(parte === 'teorico' ? 330 : 420) + (r() + r() + r() - 1.5) * 0.75));
          var x = seg > 600;
          var corr = parte === 'teorico' ? (function () { var z = r(); return z < 0.47 ? 3 : z < 0.83 ? 2 : z < 0.96 ? 1 : 0; })() : 0;
          var apr = parte === 'teorico' ? corr >= 2 : r() < 0.97;
          if (esDemo) { apr = true; x = false; seg = Math.min(seg, 540); if (parte === 'teorico') corr = Math.max(corr, 2); }
          intentos.push([ts, [new Date(ts), a[0], c[0], parte, new Date(ts - seg * 1000), seg, x ? 'SI' : 'NO', corr, parte === 'teorico' ? 3 : 0, apr ? 'SI' : 'NO', '{}', a[5], a[6]]]);
        });
      });
    });
    intentos.sort(function (x, y) { return x[0] - y[0]; });
    if (intentos.length) L.getSheetByName('Intentos').getRange(2, 1, intentos.length, 13).setValues(intentos.map(function (x) { return x[1]; }));

    // TP grupal
    var grupos = {}; pad.forEach(function (a) { (grupos[a[6]] = grupos[a[6]] || []).push(a[4] + ' ' + a[3]); });
    var tp = [], notas = [];
    Object.keys(grupos).forEach(function (g) {
      var cumplidor = 0.65 + r() * 0.33, fin = false;
      C.entregasTP.forEach(function (en) {
        var abre = local(en[4]), vence = local(en[5]) + 20 * 3600e3;
        if (ahora < abre) return;
        var vencida = ahora > vence;
        if (g === 'G07' && !vencida) { if (en[0] !== 'F') tp.push([g + '|e' + en[0], g, 'e' + en[0], '<p>Primer borrador de Tomás. ' + TEXTOS[0] + '</p>', 'Tomás Paz', abre + 3 * 3600e3]); return; }
        if (r() > cumplidor * (vencida ? 1 : Math.min(1, (ahora - abre) / (5 * 864e5)))) return;
        var tarde = vencida && r() < 0.12;
        var ts = tarde ? vence + (1 + r() * 3) * 864e5 : abre + r() * (Math.min(ahora, vence) - abre);
        var dd = new Date(ts); dd.setHours(10 + Math.floor(r() * 12), Math.floor(r() * 60)); ts = dd.getTime();
        if (ts > ahora) ts = ahora - 3600e3;
        var autor = grupos[g][Math.floor(r() * grupos[g].length)];
        var txt = '<p>' + TEXTOS[Math.floor(r() * TEXTOS.length)] + '</p><p>' + TEXTOS[Math.floor(r() * TEXTOS.length)] + '</p>';
        tp.push([g + '|e' + en[0], g, 'e' + en[0], txt, autor, Math.round(ts)]);
        if (en[0] === 'F' && vencida && r() < 0.9) fin = true;
      });
      if (fin) {
        var tf = local(C.entregasTP[C.entregasTP.length - 1][5]) + 18 * 3600e3;
        tp.push([g + '|_final', g, '_final', 'Entregado', grupos[g][0], tf]);
        if (ahora > local('2027-06-23') && r() < 0.75) notas.push([g, Math.round((5 + r() * 5) * 2) / 2, 'Buen análisis del caso; revisar la integración entre entregas.', 'Brian Steffen', new Date(tf + 6 * 864e5)]);
      }
    });
    if (tp.length) L.getSheetByName('TP').getRange(2, 1, tp.length, 6).setValues(tp);
    if (notas.length) L.getSheetByName('Notas').getRange(2, 1, notas.length, 5).setValues(notas);
  }

  demo.reiniciar = function (ms) {
    env = crearEntornoGAS();
    env._fijarAhora(ms);
    B = cargarBackend(env, CODIGO);
    B.api.configurarBitacora();
    var pad = padron();
    sembrarPlanilla(env, C, pad);
    env._libro.getSheetByName('Config').filas.forEach(function (f) { if (f[0] === 'cuatrimestre') f[1] = '1C 2027 · demo'; });
    simular(ms, pad);
    B.api.limpiarCache();
    try { localStorage.setItem('gdpo-demo-fecha', String(ms)); } catch (e) {}
  };
  demo.llamar = function (p) { return B.llamar(p); };
  demo.fechaLocal = function () {
    var d = new env.Date();
    var z = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  };
  demo.saltos = [
    ['Clase 2 recién abierta', local('2027-03-17 19:00')],
    ['Semana de la clase 5', local('2027-04-08 10:00')],
    ['Mitad de cursada', local('2027-05-13 11:00')],
    ['Antes de la entrega final', local('2027-06-14 20:00')],
    ['Fin de cursada', local('2027-07-20 10:00')]
  ];
  var guardada = null; try { guardada = Number(localStorage.getItem('gdpo-demo-fecha')); } catch (e) {}
  demo.reiniciar(guardada && guardada > local('2027-03-01') && guardada < local('2027-08-01') ? guardada : local('2027-04-08 10:00'));
  window.GDPO_DEMO = demo;
})();
