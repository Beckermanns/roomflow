import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

// =========================
// CONSTANTES DE NEGOCIO
// =========================
const WORKDAY_START_HOUR = 8;
const WORKDAY_END_HOUR = 21;
const HOURS_PER_DAY = WORKDAY_END_HOUR - WORKDAY_START_HOUR;
const SUBUTIL_THRESHOLD = 0.4;
const CANCELLED_STATE = "Rechazada";

// =========================
// ELEMENTOS DEL DOM
// =========================
const fechaInicioInput = document.getElementById("fechaInicio");
const fechaTerminoInput = document.getElementById("fechaTermino");
const filtroEdificioSelect = document.getElementById("filtroEdificio");
const filtroEspacioSelect = document.getElementById("filtroEspacio");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const btnDescargar = document.getElementById("btnDescargar");
const kpiOcupacion = document.getElementById("kpi-ocupacion");
const kpiCrecimiento = document.getElementById("kpi-crecimiento");
const kpiCancelacion = document.getElementById("kpi-cancelacion");
const detalleSalaSection = document.getElementById("detalleSala");
const detalleContenido = document.getElementById("detalleContenido");

let chartRanking = null;
let chartSubutilizados = null;
let chartTendencia = null;
let espaciosCache = null;
let edificiosCache = null;
let ultimoReporte = null;

// =========================
// UTILIDADES
// =========================

function timeStringToHours(t) {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h + m / 60 + s / 3600;
}

function getDurationHours(hra_inicio, hra_termino) {
  const start = timeStringToHours(hra_inicio);
  const end = timeStringToHours(hra_termino);
  return Math.max(end - start, 0);
}

function toDateOnly(d) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function formatDateForInput(d) {
  return d.toISOString().split("T")[0];
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(start, end) {
  const s = toDateOnly(start);
  const e = toDateOnly(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

// =========================
// CONSULTAS SUPABASE
// =========================

async function fetchEdificios() {
  if (edificiosCache) return edificiosCache;

  const { data, error } = await supabase
    .from("edificio")
    .select("id_edificio, nombre_edificio")
    .order("nombre_edificio");

  if (error) {
    console.error("Error obteniendo edificios:", error);
    return [];
  }

  edificiosCache = data;
  return data;
}

async function fetchEspacios() {
  if (espaciosCache) return espaciosCache;

  const { data, error } = await supabase
    .from("espacio")
    .select(`
      id_espacio,
      nombre_espacio,
      id_edificio,
      edificio:edificio (
        id_edificio,
        nombre_edificio
      ),
      tipo_espacio:tipo_espacio (
        id_tipo_espacio,
        nombre_tipo_espacio
      )
    `)
    .order("nombre_espacio");

  if (error) {
    console.error("Error obteniendo espacios:", error);
    return [];
  }

  espaciosCache = data;
  return data;
}

async function fetchReservasRango(fechaInicio, fechaTermino, idEdificio = null, idEspacio = null) {
  let query = supabase
    .from("reserva")
    .select(`
      id_reserva,
      id_espacio,
      fecha_reserva,
      fecha_creacion,
      hra_inicio,
      hra_termino,
      estado,
      espacio:espacio (
        id_espacio,
        nombre_espacio,
        id_edificio,
        edificio:edificio (
          id_edificio,
          nombre_edificio
        )
      )
    `)
    .gte("fecha_reserva", fechaInicio)
    .lte("fecha_reserva", fechaTermino);

  // Aplicar filtros opcionales
  if (idEspacio) {
    query = query.eq("id_espacio", idEspacio);
  } else if (idEdificio) {
    // Si hay filtro de edificio pero no de espacio, obtener espacios del edificio
    const espacios = await fetchEspacios();
    const espaciosDelEdificio = espacios
      .filter(e => e.id_edificio === idEdificio)
      .map(e => e.id_espacio);
    
    if (espaciosDelEdificio.length > 0) {
      query = query.in("id_espacio", espaciosDelEdificio);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error obteniendo reservas:", error);
    return [];
  }

  return data;
}

async function fetchReservasRangoAnterior(fechaInicio, fechaTermino, idEdificio = null, idEspacio = null) {
  const dias = diffDays(fechaInicio, fechaTermino);
  const startPrev = addDays(toDateOnly(fechaInicio), -dias);
  const endPrev = addDays(toDateOnly(fechaInicio), -1);

  return fetchReservasRango(
    formatDateForInput(startPrev), 
    formatDateForInput(endPrev),
    idEdificio,
    idEspacio
  );
}

// =========================
// CÁLCULO DE KPIs
// =========================

async function calcularTasaOcupacion(reservas, fechaInicio, fechaTermino, idEdificio = null, idEspacio = null) {
  const espacios = await fetchEspacios();
  
  // Filtrar espacios según los filtros aplicados
  let espaciosFiltrados = espacios;
  if (idEspacio) {
    espaciosFiltrados = espacios.filter(e => e.id_espacio === idEspacio);
  } else if (idEdificio) {
    espaciosFiltrados = espacios.filter(e => e.id_edificio === idEdificio);
  }

  const numEspacios = espaciosFiltrados.length;
  if (numEspacios === 0) return 0;

  const dias = diffDays(fechaInicio, fechaTermino);
  const horasDisponibles = numEspacios * dias * HOURS_PER_DAY;

  const reservasValidas = reservas.filter(r => r.estado !== CANCELLED_STATE);
  
  const horasReservadas = reservasValidas.reduce(
    (sum, r) => sum + getDurationHours(r.hra_inicio, r.hra_termino),
    0
  );

  if (horasDisponibles === 0) return 0;
  return (horasReservadas / horasDisponibles) * 100;
}

async function calcularCrecimientoReservas(reservasActual, fechaInicio, fechaTermino, idEdificio = null, idEspacio = null) {
  const prev = await fetchReservasRangoAnterior(fechaInicio, fechaTermino, idEdificio, idEspacio);

  const actual = reservasActual.length;
  const anterior = prev.length;

  if (anterior === 0) return actual > 0 ? 100 : 0;

  return ((actual - anterior) / anterior) * 100;
}

function calcularTasaCancelacion(reservas) {
  const total = reservas.length;
  if (total === 0) return 0;

  const canceladas = reservas.filter(r => r.estado === CANCELLED_STATE).length;
  return (canceladas / total) * 100;
}

async function calcularRankingEspacios(reservas) {
  const espacios = await fetchEspacios();
  const mapEsp = new Map();
  espacios.forEach(e => mapEsp.set(e.id_espacio, e));

  const reservasValidas = reservas.filter(r => r.estado !== CANCELLED_STATE);

  const conteo = new Map();
  reservasValidas.forEach(r => {
    conteo.set(r.id_espacio, (conteo.get(r.id_espacio) || 0) + 1);
  });

  return Array.from(conteo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, cantidad]) => {
      const esp = mapEsp.get(id);
      return {
        id,
        label: `${esp.edificio?.nombre_edificio}-${esp.nombre_espacio}`,
        cantidad
      };
    });
}

async function calcularSubutilizados(reservas, fechaInicio, fechaTermino, idEdificio = null, idEspacio = null) {
  const espacios = await fetchEspacios();
  
  // Filtrar espacios según los filtros aplicados
  let espaciosFiltrados = espacios;
  if (idEspacio) {
    espaciosFiltrados = espacios.filter(e => e.id_espacio === idEspacio);
  } else if (idEdificio) {
    espaciosFiltrados = espacios.filter(e => e.id_edificio === idEdificio);
  }

  const dias = diffDays(fechaInicio, fechaTermino);
  const horasDisp = dias * HOURS_PER_DAY;

  const reservasValidas = reservas.filter(r => r.estado !== CANCELLED_STATE);

  const horasPorEspacio = new Map();

  reservasValidas.forEach(r => {
    const dur = getDurationHours(r.hra_inicio, r.hra_termino);
    horasPorEspacio.set(r.id_espacio, (horasPorEspacio.get(r.id_espacio) || 0) + dur);
  });

  const resultado = [];

  espaciosFiltrados.forEach(e => {
    const hrs = horasPorEspacio.get(e.id_espacio) || 0;
    const ocup = hrs / horasDisp;

    if (ocup < SUBUTIL_THRESHOLD) {
      resultado.push({
        id: e.id_espacio,
        label: `${e.edificio?.nombre_edificio}-${e.nombre_espacio}`,
        horasUsadas: hrs.toFixed(1),
        horasDisponibles: horasDisp.toFixed(1),
        ocupacionPorc: ocup * 100
      });
    }
  });

  return resultado.sort((a, b) => a.ocupacionPorc - b.ocupacionPorc);
}

// =========================
// CÁLCULO DE TENDENCIA
// =========================

async function calcularTendenciaReservas(reservas, fechaInicio, fechaTermino) {
  const inicio = new Date(fechaInicio);
  const termino = new Date(fechaTermino);

  const diffMeses =
    (termino.getFullYear() - inicio.getFullYear()) * 12 +
    (termino.getMonth() - inicio.getMonth());

  // Si el rango es mayor o igual a 2 meses → agrupar por mes
  const agruparPorMes = diffMeses >= 2;

  const conteo = new Map();

  reservas.forEach(r => {
    const fecha = new Date(r.fecha_reserva);

    let key;   // clave real para ordenar
    let label; // texto visible en el gráfico

    if (agruparPorMes) {
      // YYYY-MM → orden correcto
      key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      label = fecha.toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric"
      });
    } else {
      // YYYY-MM-DD → orden correcto
      key = fecha.toISOString().split("T")[0];
      label = fecha.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short"
      });
    }

    if (!conteo.has(key)) {
      conteo.set(key, { label, total: 0 });
    }

    conteo.get(key).total++;
  });

  // 🔥 ORDEN CRONOLÓGICO REAL
  const ordenado = Array.from(conteo.entries())
    .sort((a, b) => new Date(a[0]) - new Date(b[0]));

  return {
    labels: ordenado.map(e => e[1].label),
    valores: ordenado.map(e => e[1].total),
    tipo: agruparPorMes ? "mensual" : "diario"
  };
}

// =========================
// RENDER
// =========================
 
function renderKpis(ocup, crec, canc) {
  kpiOcupacion.textContent = `${ocup.toFixed(1)}%`;
  kpiCrecimiento.textContent = `${crec >= 0 ? "+" : ""}${crec.toFixed(1)}%`;
  kpiCancelacion.textContent = `${canc.toFixed(1)}%`;
}

function renderChartRanking(ranking) {
  const ctx = document.getElementById("chart-ranking").getContext("2d");
  if (chartRanking) chartRanking.destroy();

  chartRanking = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ranking.map(r => r.label),
      datasets: [{
        data: ranking.map(r => r.cantidad),
        backgroundColor: "rgba(79, 70, 229, 0.7)"
      }]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } }
    }
  });
}

function renderChartSubutilizados(lista) {
  const ctx = document.getElementById("chart-subutilizados").getContext("2d");
  if (chartSubutilizados) chartSubutilizados.destroy();

  chartSubutilizados = new Chart(ctx, {
    type: "bar",
    data: {
      labels: lista.map(s => s.label),
      datasets: [{
        data: lista.map(s => s.ocupacionPorc),
        backgroundColor: "rgba(239, 68, 68, 0.7)"
      }]
    },
    options: {
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: {
        x: { max: 100 }
      }
    }
  });
}

function renderChartTendencia(tendencia) {
  const ctx = document.getElementById("chart-tendencia")?.getContext("2d");
  if (!ctx) return;
  
  if (chartTendencia) chartTendencia.destroy();

  chartTendencia = new Chart(ctx, {
    type: "line",
    data: {
      labels: tendencia.labels,
      datasets: [{
        label: `Reservas (${tendencia.tipo})`,
        data: tendencia.valores,
        borderColor: "rgba(79, 70, 229, 1)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: "rgba(79, 70, 229, 1)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `Reservas: ${context.parsed.y}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

function mostrarDetalle(html) {
  detalleContenido.innerHTML = html;
  detalleSalaSection.classList.remove("hidden");
}

// =========================
// DESCARGA CSV
// =========================

function descargarReporteCSV() {
  if (!ultimoReporte) {
    alert("No hay datos para descargar. Por favor, aplica un filtro primero.");
    return;
  }

  const { inicio, termino, ocup, crec, canc, ranking, subutil, totalReservas, edificio, espacio } = ultimoReporte;

  let csv = "REPORTE DE ANALISIS DE RESERVAS - ROOMFLOW\n\n";
  
  csv += "PERIODO\n";
  csv += "Fecha Inicio,Fecha Termino\n";
  csv += `${inicio},${termino}\n\n`;

  // Filtros aplicados
  csv += "FILTROS APLICADOS\n";
  csv += `Edificio,${edificio || 'Todos'}\n`;
  csv += `Espacio,${espacio || 'Todos'}\n\n`;

  csv += "INDICADORES CLAVE (KPIs)\n";
  csv += "Indicador,Valor\n";
  csv += `Tasa de Ocupacion,${ocup.toFixed(1)}%\n`;
  csv += `Crecimiento de Reservas,${crec.toFixed(1)}%\n`;
  csv += `Tasa de Cancelacion,${canc.toFixed(1)}%\n`;
  csv += `Total de Reservas,${totalReservas}\n\n`;

  csv += "TOP 5 ESPACIOS MAS UTILIZADOS\n";
  csv += "Posicion,Espacio,Cantidad de Reservas\n";
  ranking.forEach((r, idx) => {
    csv += `${idx + 1},${r.label},${r.cantidad}\n`;
  });
  csv += "\n";

  csv += "ESPACIOS SUBUTILIZADOS (Ocupacion < 40%)\n";
  csv += "Espacio,Horas Usadas,Horas Disponibles,Ocupacion %\n";
  subutil.forEach(s => {
    csv += `${s.label},${s.horasUsadas},${s.horasDisponibles},${s.ocupacionPorc.toFixed(1)}%\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `reporte_reservas_${inicio}_${termino}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================
// POPULATE FILTERS
// =========================

async function cargarFiltros() {
  // Cargar edificios
  const edificios = await fetchEdificios();
  filtroEdificioSelect.innerHTML = '<option value="">Todos los edificios</option>';
  edificios.forEach(ed => {
    const option = document.createElement("option");
    option.value = ed.id_edificio;
    option.textContent = ed.nombre_edificio;
    filtroEdificioSelect.appendChild(option);
  });

  // Cargar espacios
  const espacios = await fetchEspacios();
  filtroEspacioSelect.innerHTML = '<option value="">Todos los espacios</option>';
  espacios.forEach(esp => {
    const option = document.createElement("option");
    option.value = esp.id_espacio;
    option.textContent = `${esp.edificio?.nombre_edificio} - ${esp.nombre_espacio}`;
    filtroEspacioSelect.appendChild(option);
  });
}

// Cuando cambia el edificio, filtrar los espacios
filtroEdificioSelect?.addEventListener("change", async () => {
  const idEdificio = filtroEdificioSelect.value;
  const espacios = await fetchEspacios();
  
  filtroEspacioSelect.innerHTML = '<option value="">Todos los espacios</option>';
  
  const espaciosFiltrados = idEdificio 
    ? espacios.filter(e => e.id_edificio === idEdificio)
    : espacios;

  espaciosFiltrados.forEach(esp => {
    const option = document.createElement("option");
    option.value = esp.id_espacio;
    option.textContent = `${esp.edificio?.nombre_edificio} - ${esp.nombre_espacio}`;
    filtroEspacioSelect.appendChild(option);
  });
});

// =========================
// FLUJO PRINCIPAL
// =========================

async function actualizarDashboard() {
  const inicio = fechaInicioInput.value;
  const termino = fechaTerminoInput.value;
  const idEdificio = filtroEdificioSelect.value || null;
  const idEspacio = filtroEspacioSelect.value || null;

  if (!inicio || !termino) {
    alert("Por favor, selecciona las fechas de inicio y término.");
    return;
  }

  // Mostrar loading
  kpiOcupacion.textContent = "...";
  kpiCrecimiento.textContent = "...";
  kpiCancelacion.textContent = "...";

  const reservas = await fetchReservasRango(inicio, termino, idEdificio, idEspacio);

  const [ocup, crec, canc, ranking, subutil, tendencia] = await Promise.all([
    calcularTasaOcupacion(reservas, inicio, termino, idEdificio, idEspacio),
    calcularCrecimientoReservas(reservas, inicio, termino, idEdificio, idEspacio),
    calcularTasaCancelacion(reservas),
    calcularRankingEspacios(reservas),
    calcularSubutilizados(reservas, inicio, termino, idEdificio, idEspacio),
    calcularTendenciaReservas(reservas, inicio, termino)
  ]);

  renderKpis(ocup, crec, canc);
  renderChartRanking(ranking);
  renderChartSubutilizados(subutil);
  renderChartTendencia(tendencia);

  // Obtener nombres de filtros para mostrar
  const nombreEdificio = idEdificio 
    ? (await fetchEdificios()).find(e => e.id_edificio === idEdificio)?.nombre_edificio 
    : null;
  const nombreEspacio = idEspacio 
    ? (await fetchEspacios()).find(e => e.id_espacio === idEspacio)?.nombre_espacio 
    : null;

  let filtrosAplicados = "";
  if (nombreEdificio) filtrosAplicados += `<p><strong>Edificio:</strong> ${nombreEdificio}</p>`;
  if (nombreEspacio) filtrosAplicados += `<p><strong>Espacio:</strong> ${nombreEspacio}</p>`;

  mostrarDetalle(`
    <p><strong>Período:</strong> ${inicio} a ${termino}</p>
    ${filtrosAplicados}
    <p><strong>Total reservas:</strong> ${reservas.length}</p>
    <p><strong>Espacios subutilizados:</strong> ${subutil.length}</p>
    <p><strong>Agrupación:</strong> ${tendencia.tipo === 'mensual' ? 'Por mes' : 'Por día'}</p>
  `);

  ultimoReporte = {
    inicio,
    termino,
    ocup,
    crec,
    canc,
    ranking,
    subutil,
    totalReservas: reservas.length,
    edificio: nombreEdificio,
    espacio: nombreEspacio
  };
}

function limpiarFiltros() {
  filtroEdificioSelect.value = "";
  filtroEspacioSelect.value = "";
  actualizarDashboard();
}

function inicializarFechas() {
  const hoy = toDateOnly(new Date());
  const hace30 = addDays(hoy, -29);

  fechaInicioInput.value = formatDateForInput(hace30);
  fechaTerminoInput.value = formatDateForInput(hoy);
}

// =========================
// VALIDACIÓN DE FECHAS
// =========================

function validarFechas() {
  const inicio = fechaInicioInput.value;
  const termino = fechaTerminoInput.value;

  // Si hay fecha de inicio, establecer el mínimo de fecha término
  if (inicio) {
    fechaTerminoInput.min = inicio;
    
    // Si la fecha de término es menor que la de inicio, ajustarla
    if (termino && termino < inicio) {
      fechaTerminoInput.value = inicio;
    }
  }
}

// =========================
// INICIALIZACIÓN
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  inicializarFechas();
  await cargarFiltros();
  
  // Event listeners
  btnFiltrar.addEventListener("click", actualizarDashboard);
  btnLimpiarFiltros?.addEventListener("click", limpiarFiltros);
  btnDescargar.addEventListener("click", descargarReporteCSV);
  fechaInicioInput.addEventListener("change", validarFechas);
  fechaTerminoInput.addEventListener("change", validarFechas);
  
  // Validar fechas iniciales
  validarFechas();
  
  actualizarDashboard();
});
