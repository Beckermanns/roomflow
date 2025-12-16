import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

const edificioSelect = document.getElementById("edificio");
const espacioSelect = document.getElementById("recurso");
const form = document.getElementById("reserva-form");
const feedback = document.getElementById("reserva-feedback");

// Logout

window.cerrarSesion = function () {
  localStorage.removeItem("id_user");
  alert("Sesión cerrada.");
  // Redirige al index (página de login)
  window.location.href = "index.html";
};

// Obtener usuario logeado desde localStorage
const idusuarioLogeado = localStorage.getItem("id_user");
if (!idusuarioLogeado) {
  alert("No hay sesión iniciada. Redirigiendo al login.");
  window.location.href = "index.html";
}

// Al cargar la página, traer edificios
document.addEventListener("DOMContentLoaded", async () => {
  espacioSelect.disabled = true;
  espacioSelect.innerHTML = `<option value="">Seleccione</option>`;
  await cargarEdificios();

  // Bloquear fechas anteriores a hoy
  const fechaInput = document.getElementById("fecha");
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

// Crear reserva
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id_espacio = espacioSelect.value;
  const fecha_reserva = document.getElementById("fecha").value;
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

  // Construir DateTime reales
  const inicioNueva = new Date(`${fecha_reserva}T${horaInicio}`);
  let terminoNueva = new Date(`${fecha_reserva}T${horaFin}`);

  // Si termina al día siguiente
  if (horaFin <= horaInicio) {
    terminoNueva.setDate(terminoNueva.getDate() + 1);
  }

   // Validar hora
  if (horaFin <= horaInicio) {
    feedback.textContent = "La hora de término debe ser posterior que la hora de inicio.";
    return;
  }

  // Verificar solapamiento
  const { data: reservasExistentes, error } = await supabase
  .from("reserva")
  .select("hra_inicio, hra_termino")
  .eq("id_espacio", id_espacio)
  .eq("fecha_reserva", fecha_reserva);

  if (error) {
    feedback.textContent = "Error al verificar disponibilidad.";
    return;
  }

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
});
