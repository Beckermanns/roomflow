(function () {
  /*
    Módulo IIFE (Immediately Invoked Function Expression):
    Encapsula la lógica de la página de login para evitar
    contaminar el scope global.
  */

  // Referencias a elementos del DOM usados en el formulario de login
  const form = document.getElementById('login-form');
  const usuarioInput = document.getElementById('usuario');
  const contrasenaInput = document.getElementById('contrasena');
  const usuarioError = document.getElementById('usuario-error');
  const contrasenaError = document.getElementById('contrasena-error');
  const feedback = document.getElementById('feedback');
  const btnIngresar = document.getElementById('btn-ingresar');

  // Limpia mensajes de error y feedback antes de una nueva validación
  function clearErrors() {
    usuarioError.textContent = '';
    contrasenaError.textContent = '';
    feedback.textContent = '';
    // Restablece las clases de estilo del contenedor de feedback
    feedback.className = 'feedback';
  }

  /*
    Valida que los campos requeridos no estén vacíos.
    - Muestra mensajes de error específicos junto a cada campo.
    - Devuelve `true` si la validación pasa, `false` en caso contrario.
  */
  function validate() {
    let valid = true;
    clearErrors();
    if (!usuarioInput.value.trim()) {
      // Mensaje visible junto al campo de usuario
      usuarioError.textContent = 'El usuario es obligatorio.';
      valid = false;
    }
    if (!contrasenaInput.value.trim()) {
      // Mensaje visible junto al campo de contraseña
      contrasenaError.textContent = 'La contraseña es obligatoria.';
      valid = false;
    }
    return valid;
  }

  /*
    Simulación de autenticación para demo/local.
    - No usar en producción. Sustituir por llamada real al servidor.
  */
  function simulateAuth(usuario, contrasena) {
    const DEMO_USER = 'admin';
    const DEMO_PASS = 'admin123';
    return usuario === DEMO_USER && contrasena === DEMO_PASS;
  }

  // Maneja el envío del formulario de login
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Validación local de campos
    if (!validate()) return;

    // Evita múltiples envíos mientras se procesa (simulación)
    btnIngresar.disabled = true;

    // Simula una pequeña latencia como si se llamara al servidor
    setTimeout(() => {
      const ok = simulateAuth(usuarioInput.value.trim(), contrasenaInput.value);
      if (ok) {
        // Ruta de éxito: mensaje + redirección
        feedback.textContent = 'Ingreso exitoso. Redirigiendo…';
        feedback.className = 'feedback success';
        window.location.href = 'menu.html';
      } else {
        // Ruta de fallo: mostrar error y limpiar contraseña
        feedback.textContent = 'Credenciales inválidas. Intente nuevamente.';
        feedback.className = 'feedback error';
        contrasenaInput.value = '';
        contrasenaInput.focus();
      }
      // Rehabilitar botón tras procesar
      btnIngresar.disabled = false;
    }, 500);
  });
})();

