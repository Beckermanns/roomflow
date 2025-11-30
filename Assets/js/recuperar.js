import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

const form = document.getElementById("recuperar-form");
const emailInput = document.getElementById("email");
const emailError = document.getElementById("email-error");
const feedback = document.getElementById("feedback");
const btnRecuperar = document.getElementById("btn-recuperar");

function clearMessages() {
  emailError.textContent = "";
  feedback.textContent = "";
  feedback.className = "feedback";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessages();

  const email = emailInput.value.trim();
  if (!email) {
    emailError.textContent = "El correo es obligatorio.";
    return;
  }

  btnRecuperar.disabled = true;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://127.0.0.1:5500/Views/cambiar-clave.html"
    });
    if (error) throw error;

    feedback.textContent = "Enlace enviado. Revisa tu correo.";
    feedback.className = "feedback success";
    form.reset();
  } catch (err) {
    feedback.textContent = "Error: " + err.message;
    feedback.className = "feedback error";
  } finally {
    btnRecuperar.disabled = false;
  }
});
