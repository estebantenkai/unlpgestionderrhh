"""
Simulación de carga del backend GDPO (Apps Script + Google Sheets).

Modelo: cola con hasta 30 ejecuciones simultáneas (cuota "Simultaneous executions
per user" de Apps Script, que aplica porque la web app corre "como Yo") y un
LockService global que serializa las escrituras.

Los tiempos de servicio son SUPUESTOS basados en mediciones típicas de Apps Script;
se reemplazan por los reales con la prueba de rendimiento (pruebaRendimiento en Code.gs).
Uso: python3 simulacion.py
"""
import heapq, random, statistics

CONCURRENCIA = 30

def lognorm(med, disp=0.35):
    return random.lognormvariate(__import__('math').log(med), disp)

# --- Diseño A: patrón del MBA (relee toda la hoja de respuestas DENTRO del lock) ---
def costo_A(tipo, filas):
    base = lognorm(0.45)                       # arranque web app + abrir planilla
    if tipo == 'leer':
        return base + 0.000025 * filas * 5, 0.0  # getValues de toda la hoja (5 col)
    lock = 0.15 + 0.000025 * filas * 5 + lognorm(0.25)  # scan + setValues + flush
    return base, lock

# --- Diseño B: v2 propuesto (append corto bajo lock, lecturas desde CacheService) ---
def costo_B(tipo, filas):
    base = lognorm(0.40)
    if tipo == 'leer':
        return base + (0.05 if random.random() < 0.9 else 0.4), 0.0  # 90% hit de caché
    return base + 0.05, lognorm(0.18)          # appendRow/setValues de 1 fila + flush

# --- Diseño B pesimista: todo el doble de lento que lo supuesto ---
def costo_B2(tipo, filas):
    pre, lock = costo_B(tipo, filas)
    return pre * 2.2, lock * 2.8

def simular(n_alumnos, ventana_s, pedidos_por_alumno, costo, filas, semilla=1):
    random.seed(semilla)
    llegadas = []
    for _ in range(n_alumnos):
        t0 = random.uniform(0, ventana_s)
        t = t0
        for tipo in pedidos_por_alumno:
            llegadas.append((t, tipo))
            t += random.uniform(5, 90)          # el alumno lee/piensa entre pedidos
    llegadas.sort()
    libres_en = [0.0] * CONCURRENCIA            # cuándo se libera cada "slot"
    heapq.heapify(libres_en)
    lock_libre = 0.0
    esperas, totales, rechazos = [], [], 0
    for t, tipo in llegadas:
        slot = heapq.heappop(libres_en)
        inicio = max(t, slot)
        pre, en_lock = costo(tipo, filas)
        fin = inicio + pre
        if en_lock:
            entra = max(fin, lock_libre)
            if entra - fin > 15:                # tryLock(15000) vence -> "ocupado"
                rechazos += 1
                fin = fin + 15
            else:
                fin = entra + en_lock
                lock_libre = fin
        heapq.heappush(libres_en, fin)
        esperas.append(inicio - t)
        totales.append(fin - t)
    totales.sort()
    p = lambda q: totales[int(q * (len(totales) - 1))]
    return dict(pedidos=len(llegadas), p50=p(.5), p95=p(.95), max=totales[-1],
                cola_max=max(esperas), rechazos=rechazos)

ESCENARIOS = [
    # nombre, alumnos, ventana(s), pedidos por alumno
    ("Semana normal: 400 alumnos en 7 días", 400, 7*86400, ['leer','leer','escribir','leer','escribir']),
    ("Pico de cierre: 400 alumnos en la última hora", 400, 3600, ['leer','leer','escribir','leer','escribir']),
    ("En clase: 150 alumnos arrancan en 2 minutos", 150, 120, ['leer','leer','escribir','leer','escribir']),
    ("En clase: 400 alumnos arrancan en 2 minutos", 400, 120, ['leer','leer','escribir','leer','escribir']),
    ("Extremo: 400 alumnos en 20 segundos", 400, 20, ['leer','leer','escribir','leer','escribir']),
]

if __name__ == '__main__':
    # filas en la hoja de respuestas al final del cuatrimestre: 400 alumnos x 10 clases x 2 partes
    for filas, etiqueta in [(8000, 'fin de cuatrimestre, 400 alumnos')]:
        print(f"\nHoja con {filas} filas ({etiqueta})\n")
        print(f"{'Escenario':50} {'Diseño':8} {'p50':>6} {'p95':>6} {'máx':>6} {'cola':>6} {'rechazos':>8}")
        for nombre, n, v, ped in ESCENARIOS:
            for d, c in (('MBA', costo_A), ('v2', costo_B), ('v2 x2.5', costo_B2)):
                r = simular(n, v, ped, c, filas)
                print(f"{nombre:50} {d:8} {r['p50']:6.1f} {r['p95']:6.1f} {r['max']:6.1f} {r['cola_max']:6.1f} {r['rechazos']:8d}")
