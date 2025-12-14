// Función para cerrar sesión (simulación)
// - Muestra una alerta simple y redirige a la página de login (`index.html`).
// - En una implementación real se debería limpiar tokens/sesión en el servidor.

// Logout

window.cerrarSesion = function () {
  localStorage.removeItem("id_user");
  alert("Sesión cerrada.");
  // Redirige al index (página de login)
  window.location.href = "index.html";
};