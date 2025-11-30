import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

const form = document.getElementById("cambiar-form");
const claveInput = document.getElementById("nueva-clave");
const claveError = document.getElementById("clave-error");
const feedback = document.getElementById("feedback");
const btnCambiar = document.getElementById("btn-cambiar");
const togglePassword = document.getElementById("toggle-password");

// 👁️ Mostrar/Ocultar contraseña
togglePassword.addEventListener("click", () => {
  const visible = claveInput.type === "text";
  claveInput.type = visible ? "password" : "text";
  togglePassword.textContent = visible ? "👁️" : "🙈";
});

function clearMessages() {
  claveError.textContent = "";
  feedback.textContent = "";
  feedback.className = "feedback";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  const nuevaClave = claveInput.value.trim();
  if (nuevaClave.length < 6) {
    claveError.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  btnCambiar.disabled = true;
  try {
    const { error } = await supabase.auth.updateUser({ password: nuevaClave });
    if (error) throw error;

    feedback.textContent = "Contraseña actualizada correctamente. Redirigiendo…";
    feedback.className = "feedback success";
    setTimeout(() => {
      window.location.href = "index.html"; // vuelve al login
    }, 1500);
  } catch (err) {
    feedback.textContent = "Error: " + err.message;
    feedback.className = "feedback error";
  } finally {
    btnCambiar.disabled = false;
  }
});
