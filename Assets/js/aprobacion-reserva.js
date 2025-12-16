import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);
// Validar sesión
const idusuarioLogeado = localStorage.getItem("id_user");
if (!idusuarioLogeado) {
  alert("No hay sesión iniciada. Redirigiendo al login.");
  window.location.href = "index.html";
}

// Elementos DOM
const edificioFiltro = document.getElementById("edificioFiltro");
const espacioFiltro = document.getElementById("espacioFiltro");
const estadoFiltro = document.getElementById("estado");
const idReservaFiltro = document.getElementById("idreservaFiltro");
const fechaDesde = document.getElementById("fechaDesde");
const fechaHasta = document.getElementById("fechaHasta");
const buscarBtn = document.querySelector(".btn-primary");
const limpiarBtn = document.getElementById("btnLimpiar");
const tablaBody = document.getElementById("reserva-table-body");

// Inicializar filtros
document.addEventListener("DOMContentLoaded", async () => {
  await cargarEdificios();

  edificioFiltro.addEventListener("change", async (e) => {
    await cargarEspaciosPorEdificio(e.target.value);
    espacioFiltro.value = ""; // reset espacio seleccionado
  });  

  // Restricción de fechas
  fechaDesde.addEventListener("change", () => {
    fechaHasta.min = fechaDesde.value;
    fechaHasta.value = ""; // opcional: limpia la fecha hasta
  });

  buscarBtn.addEventListener("click", async () => {
    await cargarReservasFiltradas();
  });

  await cargarReservasFiltradas();

  limpiarBtn.addEventListener("click", async () => {
  // Limpiar inputs
  idReservaFiltro.value = "";
  edificioFiltro.value = "";
  espacioFiltro.innerHTML = `<option value="">Todos</option>`;
  estadoFiltro.value = "";
  fechaDesde.value = "";
  fechaHasta.value = "";
  fechaHasta.min = "";

  // Recargar reservas como al inicio
  await cargarReservasFiltradas();
  });
});

// Cargar edificios
async function cargarEdificios() {
  const { data, error } = await supabase
    .from("edificio")
    .select("id_edificio, nombre_edificio")
    .order("nombre_edificio", { ascending: true });

   if (error) {
    console.error("Error edificios:", error);
    return;
  }

  edificioFiltro.innerHTML = `<option value="">Todos</option>`;
  data.forEach((ed) => {
    const opt = document.createElement("option");
    opt.value = ed.id_edificio;
    opt.textContent = ed.nombre_edificio;
    edificioFiltro.appendChild(opt);
  });
}

// Cargar espacios por edificio
async function cargarEspaciosPorEdificio(edificioId) {
  espacioFiltro.innerHTML = `<option value="">Todos</option>`;

  if (!edificioId) return;

  const { data, error } = await supabase
    .from("espacio")
    .select("id_espacio, nombre_espacio")
    .eq("id_edificio", edificioId)
    .order("nombre_espacio", { ascending: true });

  if (error) {
    console.error("Error espacios:", error);
    return;
  }

  data.forEach((esp) => {
    const opt = document.createElement("option");
    opt.value = esp.id_espacio;
    opt.textContent = esp.nombre_espacio;
    espacioFiltro.appendChild(opt);
  });
}

// Obtener espacios de un edificio (para filtro reservas)
async function obtenerEspaciosPorEdificio(edificioId) {
  const { data, error } = await supabase
    .from("espacio")
    .select("id_espacio")
    .eq("id_edificio", edificioId);

  if (error) {
    console.error("Error espacios por edificio:", error);
    return [];
  }

  return data.map(e => e.id_espacio);
}

// Cargar reservas filtradas
async function cargarReservasFiltradas() {

  // Validación fechas
  if (
    (fechaDesde.value && !fechaHasta.value) ||
    (!fechaDesde.value && fechaHasta.value)
  ) {
    alert("Debe ingresar Fecha Desde y Fecha Hasta");
    return;
  }

  if (fechaDesde.value && fechaHasta.value && fechaHasta.value < fechaDesde.value) {
    alert("La Fecha Hasta no puede ser menor que la Fecha Desde");
    return;
  }

  let query = supabase
  .from("reserva")
  .select(`
    id_reserva,
    id_corto,
    fecha_reserva,
    hra_inicio,
    hra_termino,
    observacion,
    estado,
    id_espacio,
    espacio (
      nombre_espacio,
      edificio (
        nombre_edificio
      )
    )
  `);

// 🔹 ESTADO POR DEFECTO: Pendiente
if (!estadoFiltro.value) {
  query = query.eq("estado", "Pendiente");
} else {
  query = query.eq("estado", estadoFiltro.value);
}

// 🔹 ORDENAR POR FECHA (más reciente primero)
query = query.order("fecha_reserva", { ascending: false });

  // Filtros independientes
  if (idReservaFiltro.value) {
    query = query.eq("id_corto", idReservaFiltro.value.trim());
  }

  if (estadoFiltro.value) {
    query = query.eq("estado", estadoFiltro.value);
  }

  if (espacioFiltro.value) {
    query = query.eq("id_espacio", espacioFiltro.value);
  }

  if (edificioFiltro.value && !espacioFiltro.value) {
    const espacios = await obtenerEspaciosPorEdificio(edificioFiltro.value);

    if (espacios.length === 0) {
      tablaBody.innerHTML = "";
      return;
    }

    query = query.in("id_espacio", espacios);
  }

  if (fechaDesde.value && fechaHasta.value) {
    query = query
      .gte("fecha_reserva", fechaDesde.value)
      .lte("fecha_reserva", fechaHasta.value);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error reservas:", error);
    return;
  }

  // Limpiar tabla
  tablaBody.innerHTML = "";

  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.id_corto || r.id_reserva}</td>
      <td>${r.espacio.edificio.nombre_edificio}</td>
      <td>${r.espacio.nombre_espacio}</td>
      <td>${r.fecha_reserva}</td>
      <td>${r.hra_inicio}</td>
      <td>${r.hra_termino}</td>
      <td>${r.observacion || ""}</td>
      <td>
        <select class="estado-select" data-id="${r.id_reserva}" data-estado-original="${r.estado}">
          <option value="Pendiente" ${r.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
          <option value="Aprobada" ${r.estado === "Aprobada" ? "selected" : ""}>Aprobada</option>
          <option value="Rechazada" ${r.estado === "Rechazada" ? "selected" : ""}>Rechazada</option>
        </select>
      </td>
    `;
    tablaBody.appendChild(tr);

    const selectEstado = tr.querySelector(".estado-select");
    selectEstado.addEventListener("change", () =>
      cambiarEstadoReserva(selectEstado));
  });
}

// Logout
window.cerrarSesion = function () {
  localStorage.removeItem("id_user");
  alert("Sesión cerrada.");
  window.location.href = "index.html";
};

// Manejar cambio de estado
async function cambiarEstadoReserva(select) {
  const idReserva = select.dataset.id;
  const estadoAnterior = select.dataset.estadoOriginal;
  const nuevoEstado = select.value;

  const confirmar = confirm(
    `¿Confirma cambiar el estado de la reserva a "${nuevoEstado}"?`
  );

  // Cancela → vuelve al estado anterior
  if (!confirmar) {
    select.value = estadoAnterior;
    return;
  }

  // Actualiza en BBDD
  const { error } = await supabase
    .from("reserva")
    .update({ estado: nuevoEstado })
    .eq("id_reserva", idReserva);

  if (error) {
    alert("Error al actualizar el estado");
    console.error(error);
    select.value = estadoAnterior;
    return;
  }

  alert("Estado actualizado correctamente");

  // Actualizamos el estado original
  select.dataset.estadoOriginal = nuevoEstado;

  // Recargar tabla (para que desaparezca si ya no es Pendiente)
  await cargarReservasFiltradas();
}
