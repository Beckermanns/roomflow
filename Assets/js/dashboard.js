// Datos simulados de tickets (puedes reemplazar por localStorage o API)
const ticketsSimulados = [
  {"id": 1, "edificio": "A", "espacio": "A101", "estado": "asignado",   "prioridad": "alta",  "fecha": "2025-11-27", "tiempo_atencion": 1, "tiempo_resolucion": null},
  {"id": 2, "edificio": "B", "espacio": "B204", "estado": "resuelto",   "prioridad": "media", "fecha": "2025-11-27", "tiempo_atencion": 1, "tiempo_resolucion": 1},
  {"id": 3, "edificio": "C", "espacio": "C301", "estado": "en proceso", "prioridad": "baja",  "fecha": "2025-11-26", "tiempo_atencion": 1, "tiempo_resolucion": null},
  {"id": 4, "edificio": "A", "espacio": "A102", "estado": "resuelto",   "prioridad": "alta",  "fecha": "2025-11-27", "tiempo_atencion": 2, "tiempo_resolucion": 3},
  {"id": 5, "edificio": "C", "espacio": "C302", "estado": "asignado",   "prioridad": "media", "fecha": "2025-11-27", "tiempo_atencion": 2, "tiempo_resolucion": null}
];

// Puedes optar por leer desde localStorage si ya usas roomflow_tickets:
// const ticketsLocal = JSON.parse(localStorage.getItem("roomflow_tickets")) || [];
// const tickets = ticketsLocal.length ? ticketsLocal : ticketsSimulados;
const tickets = ticketsSimulados;

let chartEdificios = null;
let chartEstados = null;
let chartPrioridades = null;

function calcularKPIs(fechaFiltro) {
  const filtrados = fechaFiltro ? tickets.filter(t => t.fecha === fechaFiltro) : tickets.slice();
  const total = tickets.length;
  const resueltos = tickets.filter(t => t.estado === "resuelto").length;
  const activos = tickets.filter(t => t.estado !== "resuelto").length;
  const resueltosHoy = filtrados.filter(t => t.estado === "resuelto").length;

  const atencionTimes = tickets.map(t => t.tiempo_atencion).filter(x => typeof x === "number");
  const resolucionTimes = tickets.map(t => t.tiempo_resolucion).filter(x => typeof x === "number");

  const promAtencion = atencionTimes.length ? (atencionTimes.reduce((a, b) => a + b, 0) / atencionTimes.length) : 0;
  const promResolucion = resolucionTimes.length ? (resolucionTimes.reduce((a, b) => a + b, 0) / resolucionTimes.length) : 0;

  const prioridades = { alta: 0, media: 0, baja: 0 };
  tickets.forEach(t => { if (prioridades[t.prioridad] !== undefined) prioridades[t.prioridad]++; });

  document.getElementById("kpi-atencion").textContent = `${promAtencion.toFixed(1)} h`;
  document.getElementById("kpi-resolucion").textContent = `${promResolucion.toFixed(1)} h`;
  document.getElementById("kpi-activos").textContent = activos;
  document.getElementById("kpi-resueltos-hoy").textContent = resueltosHoy;
  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-resueltos").textContent = resueltos;
  document.getElementById("kpi-tasa").textContent = total ? `${((resueltos / total) * 100).toFixed(1)} %` : "0.0 %";
  document.getElementById("kpi-prioridades").textContent = `A:${prioridades.alta} M:${prioridades.media} B:${prioridades.baja}`;

  return { filtrados };
}

function agregarInteraccionBarra(ctx, labels, onClickSala) {
  // Interacción: clic en barra → muestra detalle de esa sala/edificio
  ctx.canvas.onclick = (evt) => {
    const points = chartEdificios.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, false);
    if (points.length) {
      const idx = points[0].index;
      const label = labels[idx];
      onClickSala(label);
    }
  };
}

function renderCharts(fechaFiltro) {
  const filtrados = fechaFiltro ? tickets.filter(t => t.fecha === fechaFiltro) : tickets.slice();

  // Agregaciones
  const porEdificio = {};
  const porEstado = {};
  const porPrioridad = {};
  filtrados.forEach(t => {
    porEdificio[t.edificio] = (porEdificio[t.edificio] || 0) + 1;
    porEstado[t.estado] = (porEstado[t.estado] || 0) + 1;
    porPrioridad[t.prioridad] = (porPrioridad[t.prioridad] || 0) + 1;
  });

  // Destruir previos
  chartEdificios && chartEdificios.destroy();
  chartEstados && chartEstados.destroy();
  chartPrioridades && chartPrioridades.destroy();

  // Edificios (bar)
  const ctxEdificios = document.getElementById("chart-edificios").getContext("2d");
  const labelsEdificios = Object.keys(porEdificio);
  chartEdificios = new Chart(ctxEdificios, {
    type: "bar",
    data: {
      labels: labelsEdificios,
      datasets: [{
        label: "Tickets por Edificio",
        data: Object.values(porEdificio),
        backgroundColor: "rgba(79, 70, 229, 0.7)",
        borderColor: "rgba(79, 70, 229, 1)",
        borderWidth: 1
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
  agregarInteraccionBarra(ctxEdificios, labelsEdificios, mostrarDetallePorEdificio);

  // Estados (pie)
  const ctxEstados = document.getElementById("chart-estados").getContext("2d");
  chartEstados = new Chart(ctxEstados, {
    type: "pie",
    data: {
      labels: Object.keys(porEstado),
      datasets: [{
        data: Object.values(porEstado),
        backgroundColor: ["#10b981", "#f59e0b", "#ef4444", "#6366f1"]
      }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });

  // Prioridades (pie)
  const ctxPrioridades = document.getElementById("chart-prioridades").getContext("2d");
  chartPrioridades = new Chart(ctxPrioridades, {
    type: "pie",
    data: {
      labels: Object.keys(porPrioridad),
      datasets: [{
        data: Object.values(porPrioridad),
        backgroundColor: ["#ef4444", "#facc15", "#60a5fa"]
      }]
    },
    options: { plugins: { legend: { position: "bottom" } } }
  });
}

function mostrarDetallePorEdificio(edificio) {
  const detalle = document.getElementById("detalleSala");
  const contenido = document.getElementById("detalleContenido");

  const relacionados = tickets.filter(t => t.edificio === edificio);

  if (!relacionados.length) {
    detalle.classList.add("hidden");
    return;
  }

  contenido.innerHTML = relacionados.map(t => `
    <div class="detalle-item">
      <strong>Ticket #${t.id}</strong> — ${t.estado} — ${t.prioridad}<br/>
      <small>${t.edificio}/${t.espacio} — Fecha: ${t.fecha}</small>
    </div>
  `).join("");

  detalle.classList.remove("hidden");
}

function descargarReporte() {
  const contenido = document.getElementById("detalleContenido").innerText;
  const blob = new Blob([contenido || "Sin datos"], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_kpis_sala.txt";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  const fechaInput = document.getElementById("fecha");
  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnDescargar = document.getElementById("btnDescargar");

  calcularKPIs(fechaInput.value);
  renderCharts(fechaInput.value);

  btnFiltrar.addEventListener("click", () => {
    calcularKPIs(fechaInput.value);
    renderCharts(fechaInput.value);
  });

  btnDescargar.addEventListener("click", descargarReporte);
});
