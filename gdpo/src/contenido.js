/*
 * CONTENIDO DE EJEMPLO · 1.er cuatrimestre 2027
 * Fechas: Calendario_GDPO_2026 corrido un año (mismo día de la semana). Ajustar con el calendario 2027.
 * Las preguntas y el caso del TP son una base para que el equipo de prácticos las revise.
 * De acá salen las plantillas CSV que se pegan en la planilla (ver build.js).
 */
var CONTENIDO = (function () {
  // clase, fecha, unidad, tema, abre, cierra(vacío = regla), checkpoint, título cápsula, url cápsula
  var cronograma = [
    ['1', '2027-03-10', 'I', 'Presentación de la cátedra. La gerencia de RRHH y su evolución.', '', '', 'NO', '', ''],
    ['2', '2027-03-17', 'I', 'Dirección estratégica del personal. Políticas. Modelo de múltiples roles de Ulrich.', '2027-03-17 18:15', '', 'SI', 'Entrevista a Mirella (Godrej): los roles de RRHH en la práctica', ''],
    ['3', '2027-03-24', 'II', 'Mercado de trabajo y de RRHH. Planificación de RRHH. Motivación.', '2027-03-24 18:15', '', 'SI', 'Podcast: ¿por qué trabajamos? Motivación y mix generacional', ''],
    ['4', '2027-03-31', 'III', 'Descripción y perfil del puesto. Evaluación de puestos.', '2027-03-31 18:15', '', 'SI', 'Entrevista a Juani Castoldi (Atalaya): cómo se define un puesto en una tienda', ''],
    ['5', '2027-04-07', 'III', 'Reclutamiento y selección por competencias. Inducción.', '2027-04-07 18:15', '', 'SI', 'Cápsula: un programa de inducción por dentro', ''],
    ['P1', '2027-04-14', '', '1.er parcial', '', '', 'NO', '', ''],
    ['6', '2027-04-21', 'III', 'Evaluación de desempeño. Sistemas de calificación. Potencial.', '2027-04-21 18:15', '', 'SI', 'Cápsula: la conversación de desempeño (caso Jorgelina)', ''],
    ['7', '2027-04-28', 'IV', 'Capacitación y desarrollo. Detección de necesidades y del potencial.', '2027-04-28 18:15', '', 'SI', 'Entrevista a Ramiro Marchesotti (Globant): aprender en una empresa que crece', ''],
    ['R1', '2027-05-05', '', 'Recuperatorio 1.er parcial', '', '', 'NO', '', ''],
    ['8', '2027-05-12', 'II', 'La comunicación en la empresa. Conversaciones y feedback.', '2027-05-12 18:15', '', 'SI', 'Podcast: conversaciones difíciles en el trabajo', ''],
    ['9', '2027-05-26', 'V', 'Sistema de compensaciones. Beneficios e incentivos.', '2027-05-26 18:15', '', 'SI', 'Entrevista a Álvaro Galeota (Movistar): compensaciones y beneficios', ''],
    ['10', '2027-06-02', 'VI', 'Auditoría y medición de la gestión de RRHH. Relaciones laborales.', '2027-06-02 18:15', '', 'SI', 'Gonzalo Grigera: relaciones laborales y convenios', ''],
    ['P2', '2027-06-09', '', '2.º parcial', '', '', 'NO', '', ''],
    ['11', '2027-06-16', '', 'Presentación de los TP integradores', '', '', 'NO', '', ''],
    ['12', '2027-06-30', 'VI', 'Modelo de alineamiento organizacional.', '2027-06-30 18:15', '', 'SI', 'Cápsula de cierre: alinear personas y estrategia', ''],
    ['R2', '2027-07-07', '', 'Recuperatorio 2.º parcial', '', '', 'NO', '', '']
  ];

  // clase -> [ [enunciado, [opciones], correcta(0..)] x3 ]
  var teorico = {
    '2': [
      ['Una cadena de supermercados centraliza la liquidación de sueldos en un centro de servicios compartidos y libera a sus HRBP para trabajar con los gerentes regionales en el plan de expansión. Según Ulrich, ¿qué busca este rediseño?',
        ['Reducir RRHH a su rol de experto administrativo para bajar costos.', 'Separar la eficiencia operativa del aporte estratégico, para que el área actúe como socio del negocio sin descuidar la administración.', 'Trasladar la gestión de personas por completo a los mandos medios.', 'Reforzar el rol de defensor de los empleados frente a la dirección.'], 1],
      ['Un gerente de planta se queja de que "RRHH no le resuelve" la rotación de su equipo. Desde la idea de funciones compartidas con la línea, ¿cuál es la lectura más precisa?',
        ['Es responsabilidad exclusiva de RRHH, que debe diseñar un plan de retención.', 'Es un problema del mercado laboral y ninguna de las dos áreas puede influir.', 'RRHH aporta diagnóstico y herramientas, pero la retención depende en buena medida de la gestión cotidiana del jefe directo.', 'Corresponde a la dirección general, porque la rotación afecta el resultado.'], 2],
      ['Una empresa define que "toda vacante se publica primero internamente durante cinco días". ¿Qué es esto, en términos de dirección estratégica del personal?',
        ['Un procedimiento operativo del área de selección.', 'Una política: un criterio general que orienta decisiones y expresa qué valora la organización.', 'Un objetivo de RRHH medible en el tablero.', 'Una práctica informal que no conviene escribir.'], 1]
    ],
    '3': [
      ['Una cadena de indumentaria proyecta abrir 12 tiendas el año próximo y su rotación de vendedores es del 45 % anual. ¿Qué debería considerar primero la planificación de RRHH?',
        ['Calcular sólo la dotación de las tiendas nuevas y lanzar las búsquedas.', 'Estimar la demanda total (tiendas nuevas más reposición por rotación) y contrastarla con la oferta interna y externa disponible.', 'Congelar las aperturas hasta bajar la rotación por debajo del 10 %.', 'Tercerizar la selección para no sobrecargar al área.'], 1],
      ['En un mercado donde los perfiles de análisis de datos son escasos y muy disputados, ¿qué decisión es más coherente?',
        ['Pagar por encima del mercado en todas las búsquedas de ese perfil.', 'Combinar atracción externa selectiva con desarrollo interno de perfiles cercanos, para depender menos del mercado.', 'Bajar los requisitos del perfil hasta encontrar candidatos.', 'Postergar las búsquedas hasta que el mercado se equilibre.'], 1],
      ['Una empresa aumenta el bono anual para mejorar el compromiso de un equipo de analistas jóvenes y no obtiene resultados. Desde el modelo antropológico humanista, ¿qué explica mejor el fracaso?',
        ['El monto del bono fue insuficiente.', 'Se actuó sólo sobre motivos extrínsecos y se ignoraron los intrínsecos y trascendentes: aprendizaje, sentido e impacto en otros.', 'Los modelos mecanicistas no aplican a perfiles junior.', 'Faltó un sistema de control más estricto del desempeño.'], 1]
    ],
    '4': [
      ['En una descripción de puesto se lee: "Persona proactiva, con orientación al cliente y tolerancia a la presión". ¿Cuál es el problema?',
        ['Ninguno: es una descripción completa.', 'Mezcla descripción y perfil: enumera atributos de la persona y no dice para qué existe el puesto, qué hace ni de qué responde.', 'Le falta el rango salarial para ser válida.', 'Debería redactarse en tercera persona.'], 1],
      ['¿Para qué sirve principalmente la evaluación de puestos?',
        ['Para medir cuán bien trabaja cada ocupante.', 'Para establecer el valor relativo de cada puesto dentro de la organización y sostener una estructura salarial equitativa.', 'Para decidir a quién capacitar primero.', 'Para reemplazar la descripción de puesto.'], 1],
      ['Dos puestos con el mismo título ("Analista") tienen responsabilidades muy distintas en dos áreas. ¿Qué conviene hacer?',
        ['Mantener el título y la misma banda salarial, para no generar conflictos.', 'Describir y evaluar cada puesto por su contenido real, aunque compartan el nombre.', 'Unificar las tareas para que el título sea correcto.', 'Dejar que cada gerente fije el salario.'], 1]
    ],
    '5': [
      ['En una entrevista por competencias, ¿qué pregunta evalúa mejor "trabajo en equipo"?',
        ['"¿Te considerás una persona que trabaja bien en equipo?"', '"¿Qué harías si un compañero no cumple con su parte?"', '"Contame una situación concreta en la que un trabajo grupal se trabó: qué hiciste vos y cuál fue el resultado."', '"¿Cómo te describirían tus compañeros?"'], 2],
      ['Una empresa pierde al 30 % de sus ingresantes en los primeros tres meses. ¿Qué mira primero en el programa de inducción?',
        ['Si el ingresante recibe a tiempo la computadora y el usuario.', 'Si la inducción le da sentido, vínculos y expectativas claras sobre el puesto, además de la información administrativa.', 'Si la inducción dura al menos una semana.', 'Si el manual de bienvenida está actualizado.'], 1],
      ['¿Cuál es una ventaja propia del reclutamiento interno frente al externo?',
        ['Siempre trae ideas nuevas a la organización.', 'Aprovecha el conocimiento de la cultura y funciona como señal de desarrollo para el resto.', 'Es imposible que genere conflictos.', 'Amplía la diversidad de perfiles.'], 1]
    ],
    '6': [
      ['Todo el equipo de un mismo jefe obtiene calificaciones entre 4,5 y 5 en la evaluación de desempeño. ¿Qué es lo más probable?',
        ['El equipo es excepcional y corresponde premiarlo.', 'Un sesgo de lenidad del evaluador, que vuelve la evaluación inútil para tomar decisiones.', 'Un efecto halo provocado por un solo colaborador destacado.', 'Un problema de la escala, que debería ir de 1 a 10.'], 1],
      ['En una matriz de 9 cajas (desempeño por potencial), una persona con alto desempeño y bajo potencial debería…',
        ['ascender de inmediato, porque su desempeño lo justifica.', 'retenerse y reconocerse en su rol actual, con desarrollo para profundizar su especialidad, sin forzar un ascenso.', 'incluirse en el plan de sucesión gerencial.', 'entrar en un plan de mejora del desempeño.'], 1],
      ['¿Qué aporta una evaluación 360° que no aporta la evaluación del jefe directo?',
        ['Reemplaza la conversación de desempeño.', 'Suma miradas de pares, colaboradores y clientes sobre conductas que el jefe no siempre ve.', 'Garantiza que no haya sesgos.', 'Permite calcular el aumento salarial de forma automática.'], 1]
    ],
    '7': [
      ['Un área comercial no llega a sus metas y el gerente pide "un curso de ventas". ¿Qué debería hacer primero RRHH?',
        ['Contratar el curso, porque el pedido viene de la línea.', 'Detectar la necesidad: verificar si la brecha es de conocimiento o habilidad, o si responde a otras causas como metas, herramientas o incentivos.', 'Evaluar el desempeño individual y desvincular a quienes no llegan.', 'Ofrecer el curso a toda la empresa.'], 1],
      ['Tres meses después de un curso de atención al cliente, las quejas no bajaron, aunque la encuesta de satisfacción del curso dio 4,8 sobre 5. Según Kirkpatrick, ¿qué pasó?',
        ['El curso fue un éxito: el nivel 1 es el más importante.', 'Se midió la reacción, pero no la transferencia al puesto ni el impacto en resultados.', 'La encuesta estuvo mal diseñada.', 'Hay que repetir el mismo curso.'], 1],
      ['Un líder recién promovido no logra delegar. ¿Por qué el coaching puede ser más adecuado que un curso de delegación?',
        ['Porque es más barato.', 'Porque trabaja sobre las creencias y hábitos de esa persona en su contexto real, y no sobre contenidos generales que probablemente ya conoce.', 'Porque el coach le indica qué tareas delegar.', 'Porque no requiere medir resultados.'], 1]
    ],
    '8': [
      ['Una empresa anuncia una reestructuración por mail a toda la planta un viernes a las 19. ¿Cuál es el error principal?',
        ['Usar el mail en lugar de la intranet.', 'Comunicar un cambio sensible sin preparar a los mandos medios ni abrir espacios de diálogo: deja lugar al rumor.', 'Comunicarlo a toda la planta y no sólo a los afectados.', 'No incluir un video del CEO.'], 1],
      ['¿Qué distingue al feedback útil de una opinión sobre la persona?',
        ['Que lo da siempre el jefe.', 'Que se basa en conductas observables y su efecto, y abre una conversación sobre cómo seguir.', 'Que es siempre positivo.', 'Que queda por escrito en el legajo.'], 1],
      ['Ventas promete a los clientes plazos que Producción no puede cumplir y cada área culpa a la otra. Desde la relación entre áreas, ¿qué propone RRHH?',
        ['Un taller de motivación para cada área por separado.', 'Espacios y acuerdos de coordinación entre áreas con objetivos compartidos, además de canales claros de información.', 'Sancionar al área que más se queja.', 'Que la dirección decida caso por caso.'], 1]
    ],
    '9': [
      ['Una empresa paga sueldos en el percentil 75 del mercado pero tiene alta rotación en mandos medios. ¿Qué lectura es más consistente?',
        ['Debe subir al percentil 90.', 'El salario fijo ya no es el factor diferencial: conviene revisar equidad interna, variable, beneficios y desarrollo.', 'La rotación de mandos medios es normal.', 'Debe eliminar el variable para simplificar el esquema.'], 1],
      ['¿Cuál es el riesgo principal de un incentivo atado sólo a la facturación individual en un equipo de venta consultiva?',
        ['Que encarezca la liquidación de sueldos.', 'Que desaliente la colaboración y empuje ventas que no le convienen al cliente ni a la empresa en el largo plazo.', 'Que no sea compatible con la Ley de Contrato de Trabajo.', 'Ninguno, porque alinea esfuerzo con resultado.'], 1],
      ['Dos personas en el mismo puesto y con desempeño similar cobran sueldos muy distintos. ¿Qué principio se vulnera?',
        ['Equidad externa.', 'Equidad interna.', 'Competitividad.', 'Flexibilidad.'], 1]
    ],
    '10': [
      ['¿Qué diferencia a una auditoría de RRHH de un control de gestión?',
        ['Son lo mismo con distinto nombre.', 'La auditoría revisa periódicamente si políticas y prácticas se cumplen y son adecuadas; el control de gestión sigue indicadores de forma continua para corregir el rumbo.', 'La auditoría sólo puede hacerla un consultor externo.', 'El control de gestión sólo mira costos laborales.'], 1],
      ['La rotación voluntaria en el primer año es del 35 %, mientras que la total es del 12 %. ¿Qué sugiere esa diferencia?',
        ['Que el indicador total está mal calculado.', 'Un problema concentrado en el ingreso: selección, expectativas sobre el puesto o inducción.', 'Que la empresa paga por debajo del mercado.', 'Nada relevante, porque el total está en un nivel normal.'], 1],
      ['Un convenio colectivo de actividad fija el salario básico de una categoría. ¿Qué margen tiene la empresa?',
        ['Ninguno: debe pagar exactamente ese monto.', 'Puede pagar por encima y sumar beneficios, pero no puede pagar por debajo ni empeorar las condiciones pactadas.', 'Puede acordar un salario menor si la persona lo acepta por escrito.', 'Puede no aplicarlo si no hay delegados gremiales.'], 1]
    ],
    '12': [
      ['Un tablero de RRHH informa horas de capacitación por empleado, búsquedas cerradas y ausentismo. ¿Qué crítica le haría un enfoque de alineamiento?',
        ['Tiene pocos indicadores.', 'Mide la actividad del área, pero no muestra cómo esas prácticas impactan en los objetivos del negocio.', 'El ausentismo no es un indicador de RRHH.', 'Debería informarse una vez por año.'], 1],
      ['Una empresa decide crecer en servicios, pero sigue premiando sólo la venta de equipos. ¿Qué problema muestra?',
        ['Un problema de comunicación externa.', 'Desalineamiento entre la estrategia y los sistemas de gestión de personas, en este caso los incentivos.', 'Un problema de capacitación de la fuerza de ventas.', 'Ninguno: la venta de equipos sigue siendo rentable.'], 1],
      ['¿Cuál es el punto de partida de un modelo de alineamiento organizacional?',
        ['El presupuesto del área de RRHH.', 'La estrategia y los resultados que la organización busca, para derivar de ahí qué capacidades y conductas necesita.', 'La encuesta de clima.', 'El organigrama vigente.'], 1]
    ]
  };

  // clase -> 2 preguntas abiertas sobre la cápsula (se aprueba al entregarlas completas)
  var capsula = {
    '2': ['¿Qué rol de Ulrich predomina en el área que describe la entrevistada? Citá un ejemplo concreto que hayas escuchado.', '¿Qué rol aparece menos? ¿Qué riesgo le ves a eso para la empresa?'],
    '3': ['Elegí una idea del podcast sobre motivación y relacionala con un modelo visto en el teórico.', '¿Qué haría distinto un jefe de equipo después de escuchar este podcast? Una acción concreta.'],
    '4': ['¿Qué criterio usa Atalaya para definir qué necesita un puesto de tienda? Resumilo en tus palabras.', '¿Qué diferencia entre descripción y perfil del puesto identificás en lo que cuenta el entrevistado?'],
    '5': ['¿Qué momento del programa de inducción te pareció más importante y por qué?', '¿Qué agregarías al programa para una persona que trabaja en forma remota?'],
    '6': ['¿Qué hizo bien y qué mejorarías de la conversación de desempeño que escuchaste?', '¿Qué evidencia debería tener el evaluador antes de esa conversación?'],
    '7': ['¿Cómo detectan en Globant qué necesita aprender cada persona?', '¿Qué parte de lo que contó el entrevistado se podría aplicar en una pyme? ¿Cómo?'],
    '8': ['Describí con tus palabras una técnica para dar feedback que aparece en el podcast.', 'Pensá una situación real (trabajo, facultad, club) donde la hubieras podido usar. ¿Qué habrías dicho?'],
    '9': ['¿Qué componentes del paquete de compensaciones destaca el entrevistado como más valorados hoy?', '¿Qué tensión ves entre equidad interna y competitividad en lo que cuenta?'],
    '10': ['¿Qué papel cumple el convenio colectivo en la gestión cotidiana según lo que escuchaste?', '¿Qué indicador usarías para saber si la relación con el gremio está mejorando?'],
    '12': ['¿Qué idea de la cápsula resume mejor qué significa alinear personas y estrategia?', '¿Qué práctica de RRHH revisarías primero en una organización que conozcas para alinearla?']
  };

  // TP grupal secuencial: caso Ceibo Alimentos (ficticio, para que el equipo de TP lo reemplace o ajuste)
  var caso = 'Ceibo Alimentos es una empresa familiar de La Plata que elabora pastas y tapas frescas. Tiene 380 personas, una planta en Melchor Romero y distribución propia en el AMBA. El directorio aprobó una segunda planta en Brandsen que tiene que estar operando en doce meses con 120 personas más. El área de RRHH tiene cinco personas y hasta ahora se ocupó sobre todo de liquidar sueldos y cubrir vacantes. Ustedes son el equipo que contrataron para acompañar el proyecto.';
  var entregasTP = [
    ['1', '2', 'Diagnóstico del área de RRHH', 'Con el modelo de Ulrich, describan qué roles cumple hoy el área de RRHH de Ceibo y cuáles va a necesitar para la planta nueva. Propongan dos cambios concretos en su forma de trabajar.', '2027-03-17', '2027-03-23'],
    ['2', '3', 'Plan de dotación de la planta nueva', 'Estimen cuántas personas y de qué perfiles necesita la planta de Brandsen, considerando la rotación actual del 22 % en operarios. ¿Qué cubren con movimientos internos y qué buscan afuera? Justifiquen con el mercado de trabajo de la zona.', '2027-03-24', '2027-03-30'],
    ['3', '4', 'Descripción y perfil: Supervisor/a de turno', 'Redacten la descripción y el perfil del puesto Supervisor/a de turno de la planta nueva. Separen qué hace el puesto de qué competencias requiere.', '2027-03-31', '2027-04-06'],
    ['4', '5', 'Selección e inducción', 'Diseñen el proceso de selección por competencias para los supervisores (etapas, herramientas, quién decide) y el plan de inducción de su primer mes.', '2027-04-07', '2027-04-20'],
    ['5', '6', 'Evaluación de desempeño', 'Propongan cómo evaluar el desempeño de los supervisores al cumplir seis meses: qué se evalúa, quién evalúa, qué sesgos cuidar y cómo es la conversación de cierre.', '2027-04-21', '2027-04-27'],
    ['6', '7', 'Plan de capacitación', 'Detecten tres necesidades de capacitación para el arranque de la planta y armen el plan para una de ellas, con la forma de medir sus resultados en los cuatro niveles de Kirkpatrick.', '2027-04-28', '2027-05-11'],
    ['7', '8', 'Comunicación interna del proyecto', 'Armen el plan de comunicación de la apertura para el personal de la planta actual: mensajes, canales, quién comunica y cómo se responden las dudas sobre traslados.', '2027-05-12', '2027-05-25'],
    ['8', '9', 'Compensaciones de los supervisores', 'Propongan el paquete de compensaciones de los supervisores de la planta nueva: fijo, variable y beneficios. Cuiden la equidad con los supervisores de la planta actual.', '2027-05-26', '2027-06-01'],
    ['9', '10', 'Tablero y relaciones laborales', 'Definan cuatro indicadores para seguir la gestión de personas de la planta nueva en su primer año y anticipen qué temas hay que acordar con el sindicato de la actividad.', '2027-06-02', '2027-06-14'],
    ['F', '11', 'Informe integrador para el directorio', 'Integren las entregas anteriores en una recomendación al directorio de Ceibo: qué hacer primero, con qué recursos y qué riesgos hay que vigilar. Este texto abre el PDF final que se presenta en la clase 11.', '2027-06-02', '2027-06-15']
  ];

  var docentes = [
    ['marina.filipuzzi@econo.unlp.edu.ar', 'Marina Filipuzzi', 'Titular', 'demo'],
    ['lina.zubiria@econo.unlp.edu.ar', 'Lina Zubiria', 'Adjunta', 'demo'],
    ['brian@econo.unlp.edu.ar', 'Brian Steffen', 'JTP', 'demo']
  ];

  function filasPreguntas() {
    var out = [];
    Object.keys(teorico).forEach(function (c) {
      teorico[c].forEach(function (q, i) { out.push([c, 'teorico', String(i + 1), 'opcion', q[0], q[1].join(' | '), String(q[2])]); });
      (capsula[c] || []).forEach(function (q, i) { out.push([c, 'capsula', String(i + 1), 'abierta', q, '', '']); });
    });
    return out;
  }

  return { cronograma: cronograma, filasPreguntas: filasPreguntas, entregasTP: entregasTP, docentes: docentes, caso: caso };
})();
if (typeof module !== 'undefined') module.exports = CONTENIDO;
