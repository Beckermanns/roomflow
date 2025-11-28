document.addEventListener("DOMContentLoaded", () => {
  // Referencias al DOM
  const form = document.getElementById("reserva-form");
  const feedback = document.getElementById("reserva-feedback");
  const tableBody = document.getElementById("reserva-table-body");

  // Clave usada en localStorage para almacenar las reservas
  const RESERVAS_KEY = "roomflow_reservas";

  // Genera un ID incremental para cada reserva empezando por 5001
  // - Guarda el último ID en localStorage bajo "roomflow_last_reserva".
  function getNextReservaID() {
    const last = parseInt(localStorage.getItem("roomflow_last_reserva") || "5000", 10);
    const next = last + 1;
    localStorage.setItem("roomflow_last_reserva", next.toString());
    return next;
  }

  // Guarda una nueva reserva en localStorage
  // - Añade campo `id` y estado inicial `pendiente`.
  function saveReserva(data) {
    const reservas = JSON.parse(localStorage.getItem(RESERVAS_KEY)) || [];
    const id = getNextReservaID();
    reservas.push({ ...data, id, estado: "pendiente" });
    localStorage.setItem(RESERVAS_KEY, JSON.stringify(reservas));
    return id;
  }

  // Carga y renderiza la lista de reservas en la tabla HTML
  function loadReservas() {
    const reservas = JSON.parse(localStorage.getItem(RESERVAS_KEY)) || [];
    if (tableBody) {
      tableBody.innerHTML = "";
      reservas.forEach((r, i) => {
        const row = document.createElement("tr");
        // Si la reserva está pendiente, mostrar botones para aprobar/rechazar
        row.innerHTML = `
          <td>#${r.id}</td>
          <td>${r.recurso}</td>
          <td>${r.fecha}</td>
          <td>${r.horaInicio} - ${r.horaFin}</td>
          <td>${r.motivo}</td>
          <td>${r.estado}</td>
          <td>
            ${r.estado === "pendiente" ? `
              <button onclick="validarReserva(${i}, 'aprobada')">Aprobar</button>
              <button onclick="validarReserva(${i}, 'rechazada')">Rechazar</button>
            ` : "-"}
          </td>
        `;
        tableBody.appendChild(row);
      });
    }
  }

  // Función expuesta globalmente para cambiar el estado de una reserva
  // - `index` es la posición en el array almacenado; `nuevoEstado` es texto.
  window.validarReserva = (index, nuevoEstado) => {
    const reservas = JSON.parse(localStorage.getItem(RESERVAS_KEY)) || [];
    reservas[index].estado = nuevoEstado;
    localStorage.setItem(RESERVAS_KEY, JSON.stringify(reservas));
    loadReservas();
  };

  // Manejo del envío del formulario de reservas
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const reserva = {
        recurso: form.recurso.value,
        fecha: form.fecha.value,
        horaInicio: form.horaInicio.value,
        horaFin: form.horaFin.value,
        motivo: form.motivo.value,
      };
      const id = saveReserva(reserva);
      // Mostrar feedback y limpiar formulario
      feedback.textContent = `Reserva #${id} enviada correctamente.`;
      feedback.className = "feedback success";
      form.reset();
    });
  }

  // Inicializar listado al cargar la página
  loadReservas();
});
