import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

  const edificioSelect = document.getElementById("edificio");
  const espacioSelect = document.getElementById("recurso");
  const requerimientoSelect = document.getElementById("requerimiento");
  const prioridadSelect = document.getElementById("prioridad");
  const form = document.getElementById("ticket-form");
  const feedback = document.getElementById("ticket-feedback");

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

// Al cargar la página, traer edificios y requerimientos
document.addEventListener("DOMContentLoaded", async () => {
  espacioSelect.disabled = true;
  espacioSelect.innerHTML = `<option value="">Seleccione un Espacio</option>`;
  await cargarEdificios();
  await cargarRequerimiento();
  await cargarPrioridad();
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

    espacioSelect.innerHTML = `<option value="">Seleccione un Espacio</option>`;

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

// Cargar Requerimientos
async function cargarRequerimiento() {
  try {
    const { data, error } = await supabase
      .from("requerimiento")
      .select("id_requerimiento, nombre_requerimiento")
      .order("nombre_requerimiento", { ascending: true });

    if (error) throw error;

    requerimientoSelect.innerHTML =
      `<option value="" disabled selected hidden>Seleccione un Tipo de Requerimiento</option>`;

    data.forEach((ed) => {
      const opt = document.createElement("option");
      opt.value = ed.id_requerimiento;
      opt.textContent = ed.nombre_requerimiento;
      requerimientoSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando requerimiento:", err);
  }
}

// Cargar Prioridad
async function cargarPrioridad() {
  try {
    const { data, error } = await supabase
      .from("prioridad")
      .select("id_prioridad, nombre_prioridad")
      .order("orden", { ascending: true });

    if (error) throw error;

    prioridadSelect.innerHTML =
      `<option value="" disabled selected hidden>Seleccione la Prioridad</option>`;

    data.forEach((ed) => {
      const opt = document.createElement("option");
      opt.value = ed.id_prioridad;
      opt.textContent = ed.nombre_prioridad;
      prioridadSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Error cargando prioridad:", err);
  }
}

// Cargar datos a base de datos

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  feedback.textContent = "Procesando...";
  feedback.style.color = "blue";

  // 1. Obtener valores
  const idEspacio = espacioSelect.value;
  const idRequerimiento = requerimientoSelect.value;
  // Nota: Para prioridad enviamos el TEXTO (ej: 'Alta'), no el ID, 
  // porque tu tabla 'ticket' define la columna prioridad como 'text'.
  const prioridadTexto = prioridadSelect.options[prioridadSelect.selectedIndex]?.text;
  const descripcion = document.getElementById("descripcion").value;

  // 2. Validaciones simples
  if (!idEspacio || !idRequerimiento || !prioridadTexto) {
    alert("Por favor seleccione Edificio, Espacio, Tipo y Prioridad.");
    feedback.textContent = "";
    return;
  }

  try {
    // 3. Insertar en Supabase
    // id_ticket, id_corto y estado se generan solos en la BD (defaults)
    const { data: nuevoTicket, error } = await supabase
      .from("ticket")
      .insert([
        {
          id_espacio: idEspacio,
          id_requerimiento: idRequerimiento,
          prioridad: prioridadTexto, 
          descripcion: descripcion,
          "id_Creador": idusuarioLogeado, // Viene del localStorage al inicio
          fecha_solicitud: new Date().toISOString() // Fecha automática del sistema
        },
      ])
    .select("id_corto")
    .single();

    if (error) throw error;

    // 4. Éxito
    feedback.textContent = `Ticket ingresado exitosamente. ID: ${nuevoTicket.id_corto}`;
    feedback.style.color = "white";
    form.reset();
    espacioSelect.disabled = true;

  } catch (err) {
    console.error("Error creando ticket:", err);
    feedback.textContent = "Error: " + err.message;
    feedback.style.color = "white";
  }
});
 