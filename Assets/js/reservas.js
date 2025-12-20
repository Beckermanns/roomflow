import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

const edificioSelect = document.getElementById("edificio");
const espacioSelect = document.getElementById("recurso");
const fechaInput = document.getElementById("fecha");
const form = document.getElementById("reserva-form");
const feedback = document.getElementById("reserva-feedback");
const timelineContainer = document.getElementById("timeline-container");
const displayDate = document.getElementById("display-date");
const legend = document.getElementById("legend");

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

// Horarios (8:00 - 22:00)
const hours = [];
for (let h = 8; h <= 21; h++) {
  hours.push(`${h.toString().padStart(2, '0')}:00`);
}

// Al cargar la página, traer edificios
document.addEventListener("DOMContentLoaded", async () => {
  espacioSelect.disabled = true;
  espacioSelect.innerHTML = `<option value="">Seleccione</option>`;
  await cargarEdificios();

  // Bloquear fechas anteriores a hoy
  const hoy = new Date().toISOString().split("T")[0];
  fechaInput.min = hoy;
});

// Cargar edificios
async function cargarEdificios() {
  try {
    const { data, error } = await supabase
      .from("edificio")
      .select("id_edificio, nombre_edificio")
      .order("nombre_edificio", { ascending: true });

    if (error) throw error;

    edificioSelect.innerHTML =
      `<option value="" disabled selected hidden>Seleccione un edificio</option>`;

    data.forEach((ed) => {
      const opt = document.createElement("option");
      opt.value = ed.id_edificio;
      opt.textContent = ed.nombre_edificio;
      edificioSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando edificios:", err);
  }
}

// Al cambiar edificio, cargar espacios
edificioSelect.addEventListener("change", async (e) => {
  const edificioId = e.target.value;
  await cargarEspaciosPorEdificio(edificioId);
  actualizarVisualizacion();
});

// Cargar espacios
async function cargarEspaciosPorEdificio(edificioId) {
  try {
    espacioSelect.disabled = true;
    espacioSelect.innerHTML = `<option value="">Cargando...</option>`;

    const { data, error } = await supabase
      .from("espacio")
      .select("id_espacio, nombre_espacio, id_edificio")
      .eq("id_edificio", edificioId)
      .order("nombre_espacio", { ascending: true });

    if (error) throw error;

    espacioSelect.innerHTML = `<option value="">Seleccione</option>`;

    if (!data || data.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Sin espacios disponibles";
      opt.disabled = true;
      espacioSelect.appendChild(opt);
      espacioSelect.disabled = true;
      return;
    }

    data.forEach((esp) => {
      const opt = document.createElement("option");
      opt.value = esp.id_espacio;
      opt.textContent = esp.nombre_espacio;
      espacioSelect.appendChild(opt);
    });

    espacioSelect.disabled = false;
  } catch (err) {
    console.error("Error cargando espacios:", err);
  }
}

// Actualizar visualización cuando cambia fecha o espacio
fechaInput.addEventListener("change", actualizarVisualizacion);
espacioSelect.addEventListener("change", actualizarVisualizacion);

async function actualizarVisualizacion() {
  const fecha = fechaInput.value;
  const espacioId = espacioSelect.value;

  if (!fecha || !espacioId) {
    timelineContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div>Selecciona una fecha y un espacio para ver la disponibilidad horaria</div>
      </div>
    `;
    displayDate.textContent = "Selecciona fecha y espacio";
    legend.style.display = "none";
    return;
  }

  // Formatear fecha para mostrar
  const fechaObj = new Date(fecha + 'T00:00:00');
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaFormateada = fechaObj.toLocaleDateString('es-ES', opciones);
  displayDate.innerHTML = `<strong>${fechaFormateada}</strong>`;

  // Obtener SOLO reservas Pendientes y Aprobadas
  const { data: reservas, error } = await supabase
    .from("reserva")
    .select("hra_inicio, hra_termino, estado")
    .eq("id_espacio", espacioId)
    .eq("fecha_reserva", fecha)
    .in("estado", ["Pendiente", "Aprobada"]);

  if (error) {
    console.error("Error obteniendo reservas:", error);
    return;
  }

  // Renderizar timeline solo con Pendientes y Aprobadas
  renderTimeline(reservas || []);
  legend.style.display = "flex";
}

function renderTimeline(reservas) {
  let html = '<div class="timeline">';
  
  hours.forEach((hora) => {
    const horaNum = parseInt(hora.split(':')[0]);
    
    html += `
      <div class="time-slot">
        <div class="time-label">${hora}</div>
        <div class="time-bar" id="slot-${horaNum}"></div>
      </div>
    `;
  });

  html += '</div>';
  timelineContainer.innerHTML = html;

  // Dibujar bloques SOLO de reservas Pendientes (amarillo) y Aprobadas (verde)
  reservas.forEach(reserva => {
    // Solo procesar si es Pendiente o Aprobada
    if (reserva.estado !== "Pendiente" && reserva.estado !== "Aprobada") {
      return;
    }

    const inicio = timeToMinutes(reserva.hra_inicio);
    const fin = timeToMinutes(reserva.hra_termino);
    
    const inicioHora = Math.floor(inicio / 60);
    const finHora = Math.floor(fin / 60);

    for (let h = inicioHora; h <= finHora && h < 22; h++) {
      if (h >= 8) {
        const slot = document.getElementById(`slot-${h}`);
        if (slot) {
          const inicioSlot = Math.max(0, inicio - h * 60);
          const finSlot = Math.min(60, fin - h * 60);
          
          if (finSlot > inicioSlot) {
            const top = (inicioSlot / 60) * 100;
            const height = ((finSlot - inicioSlot) / 60) * 100;
            
            const block = document.createElement('div');
            
            // Aplicar clase según el estado
            if (reserva.estado === "Aprobada") {
              block.className = 'approved-block';
              block.textContent = '';
            } else if (reserva.estado === "Pendiente") {
              block.className = 'pending-block';
              block.textContent = '';
            }
            
            block.style.top = `${top}%`;
            block.style.height = `${height}%`;
            slot.appendChild(block);
          }
        }
      }
    }
  });
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Crear reserva
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id_espacio = espacioSelect.value;
  const fecha_reserva = fechaInput.value;
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFin = document.getElementById("horaFin").value;
  const observacion = document.getElementById("motivo").value;

  if (!id_espacio || !fecha_reserva || !horaInicio || !horaFin || !observacion) {
    feedback.textContent = "Completa todos los campos obligatorios.";
    return;
  }

  // Validar fecha >= hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaSeleccionada = new Date(fecha_reserva);
  fechaSeleccionada.setHours(0, 0, 0, 0);

  if (fechaSeleccionada < hoy) {
    feedback.textContent = "No se pueden realizar reservas en fechas anteriores a hoy.";
    return;
  }

  // Validar hora
  if (horaFin <= horaInicio) {
    feedback.textContent = "La hora de término debe ser posterior que la hora de inicio.";
    return;
  }

  // Verificar solapamiento SOLO con reservas Pendientes y Aprobadas
  // Las reservas Rechazadas NO bloquean el horario
  const { data: reservasExistentes, error } = await supabase
    .from("reserva")
    .select("hra_inicio, hra_termino, estado")
    .eq("id_espacio", id_espacio)
    .eq("fecha_reserva", fecha_reserva)
    .in("estado", ["Pendiente", "Aprobada"]);

  if (error) {
    feedback.textContent = "Error al verificar disponibilidad.";
    return;
  }

  // Verificar conflicto solo con Pendientes y Aprobadas
  const conflicto = reservasExistentes.some(r =>
    horaInicio < r.hra_termino && horaFin > r.hra_inicio
  );

  if (conflicto) {
    feedback.textContent = "El espacio ya está reservado en ese horario.";
    return;
  }

  // Insertar reserva
  const { data: nuevaReserva, error: errorInsert } = await supabase
    .from("reserva")
    .insert([{
      id_espacio,
      fecha_creacion: new Date().toISOString().split("T")[0],
      fecha_reserva,
      hra_inicio: horaInicio,
      hra_termino: horaFin,
      observacion,
      estado: "Pendiente",
      id_solicitante: idusuarioLogeado,
      id_aprobador: null
    }])
    .select("id_corto")
    .single();

  if (errorInsert) {
    console.error(errorInsert);
    feedback.textContent = "No se pudo crear la reserva.";
    return;
  }

  feedback.textContent = `Reserva creada exitosamente. ID: ${nuevaReserva.id_corto}`;
  form.reset();
  espacioSelect.disabled = true;
  
  // Actualizar la visualización después de crear la reserva
  actualizarVisualizacion();
});