// Clave de almacenamiento para la lista de usuarios
const USUARIOS_KEY = "roomflow_usuarios";

// Índice del usuario que se está editando (null = crear nuevo)
let editIndex = null;

document.addEventListener("DOMContentLoaded", () => {
  // Referencias al DOM
  const form = document.getElementById("usuario-form");
  const feedback = document.getElementById("usuario-feedback");
  const tableBody = document.getElementById("usuario-table-body");

  // Maneja el envío del formulario de creación/edición de usuarios
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const usuario = {
      nombre: form.nombre.value,
      email: form.email.value,
      rol: form.rol.value,
      edificio: form.edificio.value,
      estado: form.estado.value,
    };

    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY)) || [];

    if (editIndex !== null) {
      // Actualiza un usuario existente
      usuarios[editIndex] = usuario;
      feedback.textContent = "Usuario actualizado correctamente.";
    } else {
      // Crea un nuevo usuario
      usuarios.push(usuario);
      feedback.textContent = "Usuario creado correctamente.";
    }

    // Guarda cambios en localStorage y limpia el formulario
    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    form.reset();
    form.classList.add("hidden");
    editIndex = null;
    feedback.className = "feedback success";
    renderUsuarios();
  });

  // Muestra el formulario para crear un nuevo usuario
  window.mostrarFormulario = () => {
    form.classList.remove("hidden");
    form.reset();
    editIndex = null;
    feedback.textContent = "";
  };

  // Rellena y muestra el formulario para editar un usuario existente
  window.editarUsuario = (index) => {
    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY)) || [];
    const u = usuarios[index];
    form.nombre.value = u.nombre;
    form.email.value = u.email;
    form.rol.value = u.rol;
    form.edificio.value = u.edificio;
    form.estado.value = u.estado;
    form.classList.remove("hidden");
    editIndex = index;
    feedback.textContent = "";
  };

  // Elimina un usuario después de confirmación
  window.eliminarUsuario = (index) => {
    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY)) || [];
    if (confirm("¿Desea eliminar este usuario?")) {
      usuarios.splice(index, 1);
      localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
      renderUsuarios();
    }
  };

  // Renderiza la tabla de usuarios a partir de lo guardado en localStorage
  function renderUsuarios() {
    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY)) || [];
    tableBody.innerHTML = "";
    usuarios.forEach((u, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${u.nombre}</td>
        <td>${u.email}</td>
        <td>${u.rol}</td>
        <td>${u.edificio}</td>
        <td>${u.estado}</td>
        <td>
          <button onclick="editarUsuario(${i})">✏️</button>
          <button onclick="eliminarUsuario(${i})">🗑️</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Si no hay usuarios, sembrar datos de ejemplo opcionales
    if (usuarios.length === 0) {
      const seed = [
        { nombre: "Juan Pérez", email: "juan.perez@empresa.com", rol: "Administrador", edificio: "A", estado: "Activo" },
        { nombre: "María González", email: "maria.gonzalez@empresa.com", rol: "Usuario", edificio: "B", estado: "Activo" },
        { nombre: "Carlos Ruiz", email: "carlos.ruiz@empresa.com", rol: "Usuario", edificio: "C", estado: "Activo" }
      ];
      localStorage.setItem(USUARIOS_KEY, JSON.stringify(seed));
      renderUsuarios();
    }
  }

  // Inicializa la vista al cargar la página
  renderUsuarios();
});
