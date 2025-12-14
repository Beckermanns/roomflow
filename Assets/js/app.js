import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración Supabase
const supabaseUrl = "https://wqfitbdetdyohbdxqfap.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY";
const supabase = createClient(supabaseUrl, supabaseKey);

// Referencias DOM
const form = document.getElementById("login-form");
const usuarioInput = document.getElementById("usuario");
const contrasenaInput = document.getElementById("contrasena");
const usuarioError = document.getElementById("usuario-error");
const contrasenaError = document.getElementById("contrasena-error");
const feedback = document.getElementById("feedback");
const btnIngresar = document.getElementById("btn-ingresar");
const togglePassword = document.getElementById("toggle-password");

// Mostrar/Ocultar contraseña
togglePassword.addEventListener("click", () => {
  const visible = contrasenaInput.type === "text";
  contrasenaInput.type = visible ? "password" : "text";
  togglePassword.textContent = visible ? "👁️" : "🙈";
});

// Limpiar mensajes
function clearErrors() {
  usuarioError.textContent = "";
  contrasenaError.textContent = "";
  feedback.textContent = "";
  feedback.className = "feedback";
}

// Validación
function validate() {
  let valid = true;
  clearErrors();
  if (!usuarioInput.value.trim()) {
    usuarioError.textContent = "El correo es obligatorio.";
    valid = false;
  }
  if (!contrasenaInput.value.trim()) {
    contrasenaError.textContent = "La contraseña es obligatoria.";
    valid = false;
  }
  return valid;
}

// Login con Supabase
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}



// Logout

function cerrarSesion() {
  localStorage.removeItem("id_user");
  alert("Sesión cerrada.");
  // Redirige al index (página de login)
  window.location.href = "index.html";
}

// Manejo de envío
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;

  btnIngresar.disabled = true;
  try {
    const { session } = await login(usuarioInput.value.trim(), contrasenaInput.value);

    // ⬇️ Guardar ID del usuario logeado
    const userId = session.user.id;
    localStorage.setItem("id_user", userId);

    console.log("UUID del usuario guardado:", userId);

    feedback.textContent = "Ingreso exitoso. Redirigiendo…";
    feedback.className = "feedback success";

    window.location.href = "menu.html";
  } catch (err) {
    feedback.textContent = "Credenciales inválidas. Intente nuevamente.";
    feedback.className = "feedback error";
    contrasenaInput.value = "";
    contrasenaInput.focus();
  } finally {
    btnIngresar.disabled = false;
  }
});
