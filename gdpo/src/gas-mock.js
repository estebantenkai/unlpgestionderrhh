/*
 * Simulador en memoria de los servicios de Google Apps Script que usa Code.gs
 * (SpreadsheetApp, CacheService, LockService, Utilities, ContentService).
 * Sirve para dos cosas: las pruebas automáticas en Node y el modo demo del navegador,
 * que así ejecuta EXACTAMENTE el mismo backend que va a correr en Google.
 */
function crearEntornoGAS(opciones) {
  opciones = opciones || {};
  var RealDate = Date;
  var desfase = 0;
  function FakeDate() {
    var a = Array.prototype.slice.call(arguments);
    if (!a.length) return new RealDate(RealDate.now() + desfase);
    return new (Function.prototype.bind.apply(RealDate, [null].concat(a)))();
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = function () { return RealDate.now() + desfase; };
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;

  /* ---------- SHA-256 / HMAC síncronos ---------- */
  function utf8(s) { return Array.from(unescape(encodeURIComponent(s)), function (c) { return c.charCodeAt(0); }); }
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(bytes) {
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length, m = bytes.slice(); m.push(0x80);
    while (m.length % 64 !== 56) m.push(0);
    var bits = l * 8; for (var i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
    var w = new Array(64);
    for (var o = 0; o < m.length; o += 64) {
      for (var t = 0; t < 16; t++) w[t] = (m[o + t * 4] << 24) | (m[o + t * 4 + 1] << 16) | (m[o + t * 4 + 2] << 8) | m[o + t * 4 + 3];
      for (t = 16; t < 64; t++) {
        var x = w[t - 15], y = w[t - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = []; H.forEach(function (v) { out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); });
    return out;
  }
  function hmac(msg, key) {
    var k = utf8(key); if (k.length > 64) k = sha256(k);
    while (k.length < 64) k.push(0);
    var ip = k.map(function (b) { return b ^ 0x36; }), op = k.map(function (b) { return b ^ 0x5c; });
    return sha256(op.concat(sha256(ip.concat(utf8(msg)))));
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
    }
    return s;
  }
  function unb64(s) {
    s = s.replace(/=+$/, ''); var out = [], buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) { buf = (buf << 6) | B64.indexOf(s[i]); bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } }
    return out;
  }

  /* ---------- Planilla ---------- */
  function Hoja(nombre) { this.nombre = nombre; this.filas = []; }
  Hoja.prototype.getLastRow = function () { return this.filas.length; };
  Hoja.prototype.setFrozenRows = function () {};
  Hoja.prototype.setName = function (n) { this.nombre = n; };
  Hoja.prototype.getRange = function (r, c, nr, nc) {
    if (typeof r === 'string') return new Rango(this, 1, 1, 0, 0);
    return new Rango(this, r, c, nr || 1, nc || 1);
  };
  function Rango(h, r, c, nr, nc) { this.h = h; this.r = r; this.c = c; this.nr = nr; this.nc = nc; }
  Rango.prototype.getValues = function () {
    var out = [];
    for (var i = 0; i < this.nr; i++) {
      var f = this.h.filas[this.r - 1 + i] || [], row = [];
      for (var j = 0; j < this.nc; j++) { var v = f[this.c - 1 + j]; row.push(v === undefined || v === null ? '' : v); }
      out.push(row);
    }
    return out;
  };
  Rango.prototype.getValue = function () { return this.getValues()[0][0]; };
  Rango.prototype.setValues = function (vals) {
    for (var i = 0; i < vals.length; i++) {
      var idx = this.r - 1 + i;
      while (this.h.filas.length <= idx) this.h.filas.push([]);
      for (var j = 0; j < vals[i].length; j++) {
        var v = vals[i][j];
        this.h.filas[idx][this.c - 1 + j] = (v instanceof RealDate) ? new RealDate(v.getTime()) : v;
      }
    }
    return this;
  };
  Rango.prototype.setValue = function (v) { return this.setValues([[v]]); };
  Rango.prototype.setNumberFormat = function () { return this; };
  Rango.prototype.setFontWeight = function () { return this; };
  Rango.prototype.createTextFinder = function (txt) {
    var self = this, entera = false;
    var tf = {
      matchEntireCell: function (b) { entera = b; return tf; },
      findAll: function () {
        var res = [];
        self.getValues().forEach(function (row, i) {
          row.forEach(function (v) {
            var s = String(v);
            if (entera ? s === String(txt) : s.indexOf(String(txt)) >= 0) res.push({ getRow: function () { return self.r + i; } });
          });
        });
        return res;
      },
      findNext: function () { return tf.findAll()[0] || null; }
    };
    return tf;
  };
  var libro = { hojas: {} };
  libro.getSheetByName = function (n) { return libro.hojas[n] || null; };
  libro.insertSheet = function (n) { return (libro.hojas[n] = new Hoja(n)); };
  libro.getSheets = function () { return Object.keys(libro.hojas).map(function (k) { return libro.hojas[k]; }); };

  /* ---------- Caché (con vencimiento) ---------- */
  var cacheMem = {};
  function vivo(k) { var e = cacheMem[k]; if (!e) return null; if (e.x < FakeDate.now()) { delete cacheMem[k]; return null; } return e.v; }
  var cache = {
    get: function (k) { return vivo(k); },
    put: function (k, v, ttl) { cacheMem[k] = { v: String(v), x: FakeDate.now() + (ttl || 600) * 1000 }; },
    putAll: function (o, ttl) { Object.keys(o).forEach(function (k) { cache.put(k, o[k], ttl); }); },
    getAll: function (ks) { var o = {}; ks.forEach(function (k) { var v = vivo(k); if (v !== null) o[k] = v; }); return o; },
    remove: function (k) { delete cacheMem[k]; },
    removeAll: function (ks) { ks.forEach(function (k) { delete cacheMem[k]; }); }
  };

  var logs = [];
  var env = {
    Date: FakeDate,
    SpreadsheetApp: { getActiveSpreadsheet: function () { return libro; }, flush: function () {} },
    CacheService: { getScriptCache: function () { return cache; } },
    LockService: { getScriptLock: function () { return { tryLock: function () { return true; }, waitLock: function () {}, releaseLock: function () {} }; } },
    Utilities: {
      getUuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); },
      computeHmacSha256Signature: function (v, k) { return hmac(String(v), String(k)); },
      base64EncodeWebSafe: function (v) { return b64(typeof v === 'string' ? utf8(v) : v); },
      base64DecodeWebSafe: function (s) { return unb64(s); },
      newBlob: function (bytes) { return { getDataAsString: function () { return decodeURIComponent(escape(String.fromCharCode.apply(null, bytes))); } }; }
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: function (s) { return { contenido: s, setMimeType: function () { return this; }, getContent: function () { return s; } }; }
    },
    Logger: { log: function (m) { logs.push(String(m)); if (opciones.verbose) console.log(m); } },
    console: opciones.console || { log: function () {}, warn: function () {}, error: function (e) { logs.push('console.error: ' + e); } },
    // control del simulador
    _libro: libro,
    _logs: logs,
    _fijarAhora: function (ms) { desfase = ms - RealDate.now(); },
    _limpiarCache: function () { cacheMem = {}; }
  };
  return env;
}
if (typeof module !== 'undefined') module.exports = { crearEntornoGAS: crearEntornoGAS };
