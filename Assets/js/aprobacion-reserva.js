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
const tablaBody = document.getElementById("reserva-table-body");

// Inicializar filtros
document.addEventListener("DOMContentLoaded", async () => {
  await cargarEdificios();
  edificioFiltro.addEventListener("change", async (e) => {
    await cargarEspaciosPorEdificio(e.target.value);
  });
  buscarBtn.addEventListener("click", async () => {
    await cargarReservasFiltradas();
  });
  await cargarReservasFiltradas(); // carga inicial
});

// Cargar edificios
async function cargarEdificios() {
  const { data, error } = await supabase
    .from("edificio")
    .select("id_edificio, nombre_edificio")
    .order("nombre_edificio", { ascending: true });

  if (error) return console.error("Error edificios:", error);

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
  const { data, error } = await supabase
    .from("espacio")
    .select("id_espacio, nombre_espacio")
    .eq("id_edificio", edificioId)
    .order("nombre_espacio", { ascending: true });

  if (error) return console.error("Error espacios:", error);

  espacioFiltro.innerHTML = `<option value="">Todos</option>`;
  data.forEach((esp) => {
    const opt = document.createElement("option");
    opt.value = esp.id_espacio;
    opt.textContent = esp.nombre_espacio;
    espacioFiltro.appendChild(opt);
  });
}

// Cargar reservas filtradas
async function cargarReservasFiltradas() {
  let query = supabase
    .from("reserva")
    .select(`
      id_reserva, id_corto, fecha_reserva, hra_inicio, hra_termino, observacion, estado,
      espacio(id_espacio, nombre_espacio, edificio(nombre_edificio))
    `)
    .eq("estado", "Pendiente");

  if (idReservaFiltro.value)
    query = query.eq("id_corto", idReservaFiltro.value.trim());

  if (edificioFiltro.value)
    query = query.eq("espacio.edificio.id_edificio", edificioFiltro.value);

  if (espacioFiltro.value)
    query = query.eq("id_espacio", espacioFiltro.value);

  if (estadoFiltro.value)
    query = query.eq("estado", estadoFiltro.value);

  if (fechaDesde.value)
    query = query.gte("fecha_reserva", fechaDesde.value);

  if (fechaHasta.value)
    query = query.lte("fecha_reserva", fechaHasta.value);

  const { data, error } = await query;

  if (error) return console.error("Error reservas:", error);

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
      <td>${r.observacion}</td>
      <td>
        <select class="estado-select" data-id="${r.id_reserva}">
          <option value="Pendiente" ${r.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
        </select>
      </td>      
    `;
    tablaBody.appendChild(tr);
  });

  document.querySelectorAll(".estado-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      const nuevoEstado = e.target.value;
      const msgSpan = document.getElementById(`msg-${id}`);

      const { error } = await supabase
        .from("reserva")
        .update({ estado: nuevoEstado, id_aprobador: idusuarioLogeado })
        .eq("id_reserva", id);

      if (error) {
        msgSpan.textContent = "Error al guardar";
        msgSpan.style.color = "red";
        console.error("Error actualizando estado:", error);
      } else {
        msgSpan.textContent = "Se guardaron los cambios";
        msgSpan.style.color = "green";
      }
    });
  });
}
