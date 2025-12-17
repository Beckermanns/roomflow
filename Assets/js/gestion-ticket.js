import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

// Logout
window.cerrarSesion = function () {
  localStorage.removeItem("id_user");
  alert("Sesión cerrada.");
  window.location.href = "index.html";
};

// Obtener usuario logeado desde localStorage
const idusuarioLogeado = localStorage.getItem("id_user");
if (!idusuarioLogeado) {
  alert("No hay sesión iniciada. Redirigiendo al login.");
  window.location.href = "index.html";
}

// Variable global para el ticket a cerrar
let ticketACerrar = null;
let tecnicosDisponibles = [];
let ticketsActuales = [];

// Elementos DOM
const idTicketFiltro = document.getElementById("idTicketFiltro");
const estadoFiltro = document.getElementById("estadoFiltro");
const tipoFiltro = document.getElementById("tipoFiltro");
const prioridadFiltro = document.getElementById("prioridadFiltro");
const fechaDesdeFiltro = document.getElementById("fechaDesdeFiltro");
const fechaHastaFiltro = document.getElementById("fechaHastaFiltro");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnLimpiar = document.getElementById("btnLimpiar");
const tablaBody = document.getElementById("ticket-table-body");
const modalCierre = document.getElementById("modalCierre");
const motivoCierre = document.getElementById("motivoCierre");

// Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  await cargarTiposRequerimiento();
  await cargarTecnicos();
  await cargarTicketsFiltrados();

  // Restricción de fechas
  fechaDesdeFiltro.addEventListener("change", () => {
    fechaHastaFiltro.min = fechaDesdeFiltro.value;
  });

  btnFiltrar.addEventListener("click", async () => {
    await cargarTicketsFiltrados();
  });

  btnLimpiar.addEventListener("click", async () => {
    limpiarFiltros();
    await cargarTicketsFiltrados();
  });
});

// Limpiar filtros
function limpiarFiltros() {
  idTicketFiltro.value = "";
  estadoFiltro.value = "";
  tipoFiltro.value = "";
  prioridadFiltro.value = "";
  fechaDesdeFiltro.value = "";
  fechaHastaFiltro.value = "";
  fechaHastaFiltro.min = "";
}

// Cargar técnicos desde la base de datos
async function cargarTecnicos() {
  const { data, error } = await supabase
    .from("tecnicos")
    .select("id_tecnico, nombre_tecnico")
    .order("nombre_tecnico", { ascending: true });

  if (error) {
    console.error("Error cargando técnicos:", error);
    return;
  }

  tecnicosDisponibles = data;
}

// Cargar tipos de requerimiento desde la base de datos
async function cargarTiposRequerimiento() {
  const { data, error } = await supabase
    .from("requerimiento")
    .select("id_requerimiento, nombre_requerimiento")
    .order("nombre_requerimiento", { ascending: true });

  if (error) {
    console.error("Error cargando tipos:", error);
    return;
  }

  tipoFiltro.innerHTML = `<option value="">Todos</option>`;
  data.forEach((req) => {
    const opt = document.createElement("option");
    opt.value = req.id_requerimiento;
    opt.textContent = req.nombre_requerimiento;
    tipoFiltro.appendChild(opt);
  });
}

// Cargar tickets con filtros
async function cargarTicketsFiltrados() {
  // Validación fechas
  if (
    (fechaDesdeFiltro.value && !fechaHastaFiltro.value) ||
    (!fechaDesdeFiltro.value && fechaHastaFiltro.value)
  ) {
    alert("Debe ingresar Fecha Desde y Fecha Hasta");
    return;
  }

  if (
    fechaDesdeFiltro.value &&
    fechaHastaFiltro.value &&
    fechaHastaFiltro.value < fechaDesdeFiltro.value
  ) {
    alert("La Fecha Hasta no puede ser menor que la Fecha Desde");
    return;
  }

  let query = supabase.from("ticket").select(`
      id_ticket,
      id_corto,
      fecha_solicitud,
      estado,
      prioridad,
      descripcion,
      motivo_cierre,
      id_espacio,
      id_requerimiento,
      id_tecnico,
      espacio (
        nombre_espacio,
        edificio (
          nombre_edificio
        )
      ),
      requerimiento (
        nombre_requerimiento
      )
    `);

  // Aplicar filtros
  if (idTicketFiltro.value) {
    query = query.eq("id_corto", idTicketFiltro.value.trim());
  }

  if (estadoFiltro.value) {
    query = query.eq("estado", estadoFiltro.value);
  }

  if (tipoFiltro.value) {
    query = query.eq("id_requerimiento", tipoFiltro.value);
  }

  if (prioridadFiltro.value) {
    query = query.ilike("prioridad", prioridadFiltro.value);
  }

  if (fechaDesdeFiltro.value && fechaHastaFiltro.value) {
    // Agregar hora inicial y final para rango completo
    const fechaInicio = fechaDesdeFiltro.value + "T00:00:00.000Z";
    const fechaFin = fechaHastaFiltro.value + "T23:59:59.999Z";
    
    query = query
      .gte("fecha_solicitud", fechaInicio)
      .lte("fecha_solicitud", fechaFin);
  }

  const { data, error } = await query.order("fecha_solicitud", {
    ascending: false,
  });

  if (error) {
    console.error("Error cargando tickets:", error);
    alert("Error cargando tickets: " + error.message);
    return;
  }

  // 1. GUARDAR DATOS EN LA VARIABLE GLOBAL
  ticketsActuales = data;

  // Limpiar tabla
  tablaBody.innerHTML = "";

  if (!data || data.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="11" style="text-align: center; padding: 20px;">No se encontraron tickets</td>`;
    tablaBody.appendChild(tr);
    return;
  }

  // Obtener técnicos asignados para estos tickets
  const tecnicosIds = [...new Set(data.map(t => t.id_tecnico).filter(id => id))];
  let tecnicosMap = {};
  
  if (tecnicosIds.length > 0) {
    const { data: tecnicosData, error: tecnicosError } = await supabase
      .from("tecnicos")
      .select("id_tecnico, nombre_tecnico")
      .in("id_tecnico", tecnicosIds);
    
    if (!tecnicosError && tecnicosData) {
      tecnicosMap = Object.fromEntries(tecnicosData.map(t => [t.id_tecnico, t.nombre_tecnico]));
    }
  }

  data.forEach((t) => {
    const tr = document.createElement("tr");

    // Formatear fecha y hora
    const fecha = new Date(t.fecha_solicitud);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    // Obtener nombres
    const edificio = t.espacio?.edificio?.nombre_edificio || "N/A";
    const espacio = t.espacio?.nombre_espacio || "N/A";
    const tipo = t.requerimiento?.nombre_requerimiento || "N/A";
    const tecnicoAsignado = t.id_tecnico ? (tecnicosMap[t.id_tecnico] || "N/A") : "Sin asignar";

    // Crear selector de técnico
    let selectorTecnico = "";
    if (t.estado === "pendiente") {
      // Solo mostrar selector en tickets pendientes
      selectorTecnico = `
        <select class="tecnico-select" onchange="asignarTecnico('${t.id_ticket}', this.value)" style="width: 100%; padding: 6px; border-radius: 6px; border: 1px solid var(--border); background-color: rgba(15, 23, 42, 0.7); color: var(--text);">
          <option value="">Seleccionar técnico</option>
          ${tecnicosDisponibles.map(tec => `
            <option value="${tec.id_tecnico}">
              ${tec.nombre_tecnico}
            </option>
          `).join('')}
        </select>
      `;
    } else if (t.estado === "en proceso" || t.estado === "cerrado") {
      // Mostrar solo el nombre del técnico asignado (no editable)
      selectorTecnico = tecnicoAsignado || "N/A";
    } else {
      selectorTecnico = "N/A";
    }

    // Botón de cerrar (solo si no está cerrado)
    let botonCerrar = "";
    if (t.estado !== "cerrado") {
      botonCerrar = `<button class="btn-primary" style="font-size: 12px; padding: 6px 10px;" onclick="abrirModalCierre('${t.id_ticket}')">Cerrar</button>`;
    }

    // 2. CREAR ENLACE EN EL ID (clicable)
    const idLink = `<a href="#" onclick="verDetalleTicket('${t.id_ticket}'); return false;" style="color: #3b82f6; text-decoration: underline; font-weight: bold;">${t.id_corto || t.id_ticket}</a>`;

    tr.innerHTML = `
      <td>${idLink}</td>
      <td>${edificio}</td>
      <td>${espacio}</td>
      <td>${tipo}</td>
      <td>${t.descripcion || ""}</td>
      <td>${t.prioridad}</td>
      <td>${t.estado}</td>
      <td>${fechaFormateada}</td>
      <td>${selectorTecnico}</td>
      <td>${botonCerrar}</td>
      <td>${t.motivo_cierre || ""}</td>
    `;
    tablaBody.appendChild(tr);
  });
}

// Asignar técnico a ticket
window.asignarTecnico = async function (idTicket, idTecnico) {
  if (!idTecnico) {
    alert("Debe seleccionar un técnico");
    return;
  }

  try {
    const { error } = await supabase
      .from("ticket")
      .update({
        id_tecnico: idTecnico,
        estado: "en proceso",
      })
      .eq("id_ticket", idTicket);

    if (error) throw error;

    alert("Técnico asignado exitosamente. Ticket en proceso.");
    await cargarTicketsFiltrados();
  } catch (err) {
    console.error("Error asignando técnico:", err);
    alert("Error al asignar técnico: " + err.message);
  }
};

// Abrir modal de cierre
window.abrirModalCierre = function (idTicket) {
  ticketACerrar = idTicket;
  motivoCierre.value = "";
  modalCierre.style.display = "block";
  document.body.style.overflow = "hidden"; // Prevenir scroll del body
};

// Cerrar modal
window.cerrarModal = function () {
  ticketACerrar = null;
  motivoCierre.value = "";
  modalCierre.style.display = "none";
  document.body.style.overflow = "auto"; // Restaurar scroll del body
};

// Confirmar cierre de ticket
window.confirmarCierre = async function () {
  const motivo = motivoCierre.value.trim();

  if (!motivo) {
    alert("Debe ingresar un motivo del cierre");
    return;
  }

  if (!ticketACerrar) {
    alert("Error: No se ha seleccionado un ticket");
    return;
  }

  try {
    const { error } = await supabase
      .from("ticket")
      .update({
        estado: "cerrado",
        motivo_cierre: motivo,
        id_cierre: idusuarioLogeado,
        fecha_cierre_solicitud: new Date().toISOString()
      })
      .eq("id_ticket", ticketACerrar);

    if (error) throw error;

    alert("Ticket cerrado exitosamente");
    cerrarModal();
    await cargarTicketsFiltrados();
  } catch (err) {
    console.error("Error cerrando ticket:", err);
    alert("Error al cerrar el ticket: " + err.message);
  }
};

// Cerrar modal al hacer clic fuera
modalCierre.addEventListener("click", function (e) {
  if (e.target === modalCierre) {
    cerrarModal();
  }
});

// Cerrar modal con tecla ESC
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && modalCierre.style.display === "block") {
    cerrarModal();
  }
});

// --------------------------------------------------
// Funciones para ver detalle del ticket (modal)
// --------------------------------------------------
// Función para ver el detalle (se llama al hacer click en el ID)
window.verDetalleTicket = function (idTicket) {
  // Buscar el ticket en la variable global
  const t = ticketsActuales.find((ticket) => ticket.id_ticket === idTicket);

  if (!t) return;

  // Formatear fechas
  const fechaSol = new Date(t.fecha_solicitud).toLocaleString();
  const fechaCierre = t.fecha_cierre_solicitud ? new Date(t.fecha_cierre_solicitud).toLocaleString() : "No cerrado";
  
  // Obtener nombres seguros
  const edificio = t.espacio?.edificio?.nombre_edificio || "N/A";
  const espacio = t.espacio?.nombre_espacio || "N/A";
  const requerimiento = t.requerimiento?.nombre_requerimiento || "N/A";

  // Buscar nombre del técnico en el array de tecnicosDisponibles (si lo tienes cargado)
  let nombreTecnico = "Sin asignar";
  if (t.id_tecnico) {
    const tecnicoObj = tecnicosDisponibles.find((tec) => tec.id_tecnico === t.id_tecnico);
    if (tecnicoObj) nombreTecnico = tecnicoObj.nombre_tecnico;
  }

  // Llenar el HTML del modal
  const contenido = document.getElementById("contenidoDetalle");
  if (!contenido) return;

  contenido.innerHTML = `
    <p><strong>ID Corto:</strong> ${t.id_corto || "N/A"}</p>
    <p><strong>ID Sistema:</strong> <small>${t.id_ticket}</small></p>
    <hr>
    <p><strong>Estado:</strong> ${t.estado ? t.estado.toUpperCase() : 'N/A'}</p>
    <p><strong>Prioridad:</strong> ${t.prioridad}</p>
    <p><strong>Fecha Solicitud:</strong> ${fechaSol}</p>
    <hr>
    <p><strong>Ubicación:</strong> Edificio ${edificio} - ${espacio}</p>
    <p><strong>Tipo Requerimiento:</strong> ${requerimiento}</p>
    <p><strong>Descripción:</strong><br> ${t.descripcion || "Sin descripción"}</p>
    <hr>
    <p><strong>Técnico Asignado:</strong> ${nombreTecnico}</p>
    ${t.motivo_cierre ? `<p><strong>Motivo Cierre:</strong> ${t.motivo_cierre}</p>` : ''}
    ${t.fecha_cierre_solicitud ? `<p><strong>Fecha Cierre:</strong> ${fechaCierre}</p>` : ''}
  `;

  // Mostrar modal
  const modal = document.getElementById("modalDetalle");
  if (modal) modal.style.display = "block";
};

// Función para cerrar el modal de detalle
window.cerrarModalDetalle = function () {
  const modal = document.getElementById("modalDetalle");
  if (modal) modal.style.display = "none";
};

// Cerrar modal al hacer clic fuera (para el modal de detalle también)
const modalDetalle = document.getElementById("modalDetalle");
if (modalDetalle) {
  window.addEventListener("click", function (e) {
    if (e.target === modalDetalle) {
      cerrarModalDetalle();
    }
  });
}