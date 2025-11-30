import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

const form = document.getElementById("usuario-form");
const feedback = document.getElementById("usuario-feedback");
const tableBody = document.getElementById("usuario-table-body");
const btnCrear = document.getElementById("btn-crear");
const btnBuscar = document.getElementById("btn-buscar");
const btnGuardar = document.getElementById("btn-guardar");

const rolSelect = document.getElementById("rol");
const edificioSelect = document.getElementById("edificio");

let usuarioActual = null;

// Cargar roles y edificios
async function cargarOpciones() {
  const [roles, edificios] = await Promise.all([
    supabase.from("rol").select("id_rol, nombre_rol"),
    supabase.from("edificio").select("id_edificio, nombre_edificio")
  ]);

  rolSelect.innerHTML = "";
  roles.data.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id_rol;
    opt.textContent = r.nombre_rol;
    rolSelect.appendChild(opt);
  });

  edificioSelect.innerHTML = "";
  edificios.data.forEach(e => {
    const opt = document.createElement("option");
    opt.value = e.id_edificio;
    opt.textContent = e.nombre_edificio;
    edificioSelect.appendChild(opt);
  });
}

// Crear usuario
btnCrear.addEventListener("click", async () => {
  const rut = form.rut.value.trim();

  // 1. Crear usuario en Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: form.email.value,
    password: "Temporal123."  // contraseña provisional
  });

  if (authError) {
    feedback.textContent = "Error creando usuario Auth: " + authError.message;
    feedback.className = "feedback error";
    return;
  }

  const id_user = authData.user.id;

  // 2. Insertar en tabla usuario
  const usuario = {
    id_user,
    rut,
    nombre: form.nombre.value,
    apellido: form.apellido.value,
    correo: form.email.value,
    id_rol: form.rol.value,
    id_edificio: form.edificio.value,
    estado: form.estado.value
  };

  const { error } = await supabase.from("usuario").insert(usuario);

  if (error) {
    feedback.textContent = "Error al crear usuario: " + error.message;
    feedback.className = "feedback error";
  } else {
    feedback.textContent = "Usuario creado correctamente.";
    feedback.className = "feedback success";
    form.reset();
  }
});

// Buscar usuario por RUT
btnBuscar.addEventListener("click", async () => {
  const rut = form.rut.value.trim();
  const { data, error } = await supabase
    .from("usuario")
    .select("*")
    .eq("rut", rut)
    .single();

  if (error || !data) {
    feedback.textContent = "Usuario no encontrado.";
    feedback.className = "feedback error";
    btnGuardar.disabled = true;
    usuarioActual = null;
    return;
  }

  // Completar formulario
  form.nombre.value = data.nombre;
  form.apellido.value = data.apellido;
  form.email.value = data.correo;
  form.rol.value = data.id_rol;
  form.edificio.value = data.id_edificio;
  form.estado.value = data.estado;

  usuarioActual = data.id_user;   // AQUÍ SE GUARDA EL UUID REAL
  btnGuardar.disabled = false;
  feedback.textContent = "Usuario cargado para edición.";
  feedback.className = "feedback success";
});

// Guardar cambios
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!usuarioActual) return;

  const usuario = {
    correo: form.email.value,
    id_edificio: form.edificio.value,
    estado: form.estado.value
  };

  const { error } = await supabase
    .from("usuario")
    .update(usuario)
    .eq("id_user", usuarioActual);

  if (error) {
    feedback.textContent = "Error al guardar: " + error.message;
    feedback.className = "feedback error";
  } else {
    feedback.textContent = "Usuario actualizado correctamente.";
    feedback.className = "feedback success";
    form.reset();
    btnGuardar.disabled = true;
    usuarioActual = null;
  }
});

// Inicializar
cargarOpciones();
