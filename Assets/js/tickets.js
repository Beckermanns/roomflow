document.addEventListener("DOMContentLoaded", () => {
  // Referencias al DOM
  const form = document.getElementById("ticket-form");
  const feedback = document.getElementById("ticket-feedback");
  const ticketList = document.getElementById("ticket-list");
  const tableBody = document.getElementById("ticket-table-body");

  // Clave de almacenamiento para los tickets
  const TICKETS_KEY = "roomflow_tickets";

  // Genera el siguiente número de ticket (comienza en 1001 por defecto)
  function getNextTicketNumber() {
    const last = parseInt(localStorage.getItem("roomflow_last_ticket") || "1000", 10);
    const next = last + 1;
    localStorage.setItem("roomflow_last_ticket", next.toString());
    return next;
  }

  // Guarda un ticket en localStorage y le asigna un número y estado inicial
  function saveTicket(data) {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];
    const numero = getNextTicketNumber();
    tickets.push({ ...data, numero, estado: "asignado" });
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
    return numero;
  }

  // Actualiza campos de un ticket existente (por índice)
  function updateTicket(index, data) {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];
    tickets[index] = { ...tickets[index], ...data };
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  }

  // Renderiza la lista de tickets (vista lista y tabla)
  function loadTickets() {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];

    if (ticketList) {
      ticketList.innerHTML = "";
      tickets.forEach((t) => {
        const li = document.createElement("li");
        li.className = "ticket-item";
        li.innerHTML = `
          <strong>#${t.numero}</strong> — ${t.tipo}<br/>
          ${t.descripcion}<br/>
          <small>${t.edificio} / ${t.espacio} — Prioridad: ${t.prioridad}</small>
        `;
        ticketList.appendChild(li);
      });
    }

    if (tableBody) {
      tableBody.innerHTML = "";
      tickets.forEach((t, i) => {
        const row = document.createElement("tr");
        
        // Determinar si el ticket está cerrado
        const isCerrado = t.estado === "cerrado";
        
        // Botón para avanzar estado (deshabilitado si está cerrado)
        let estadoButton = '';
        if (isCerrado) {
          estadoButton = '<button disabled>Cerrado</button>';
        } else {
          estadoButton = `<button onclick="actualizarEstado(${i})">Actualizar Estado</button>`;
        }
        
        row.innerHTML = `
          <td>#${t.numero}</td>
          <td>${t.tipo}</td>
          <td>${t.descripcion}</td>
          <td>${t.edificio}</td>
          <td>${t.espacio}</td>
          <td>${t.prioridad}</td>
          <td><span class="estado-${t.estado}">${t.estado}</span></td>
          <td>${estadoButton}</td>
          <td><button onclick="editarTicket(${i})">Editar</button></td>
        `;
        tableBody.appendChild(row);
      });
    }
  }

  // Avanza el estado del ticket a la siguiente etapa predefinida
  window.actualizarEstado = (index) => {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];
    const estados = ["asignado", "en progreso", "resuelto", "cerrado"];
    const actual = tickets[index].estado || "asignado";
    const currentIndex = estados.indexOf(actual);
    
    // Solo avanzar si no está en el último estado
    if (currentIndex < estados.length - 1) {
      const siguiente = estados[currentIndex + 1];
      tickets[index].estado = siguiente;
      localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
      loadTickets();
    } else {
      alert("El ticket ya está cerrado. Usa el botón 'Editar' si necesitas modificarlo.");
    }
  };

  // Abre un modal para editar un ticket
  // - Crea un formulario dinámico, permite actualizar campos y guarda con updateTicket
  window.editarTicket = (index) => {
    const tickets = JSON.parse(localStorage.getItem(TICKETS_KEY)) || [];
    const ticket = tickets[index];
    
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Editar Ticket #${ticket.numero}</h2>
        <form id="edit-form">
          <div class="form-group">
            <label>Edificio:</label>
            <input type="text" name="edificio" value="${ticket.edificio}">
          </div>
          <div class="form-group">
            <label>Espacio:</label>
            <input type="text" name="espacio" value="${ticket.espacio}">
          </div>
          <div class="form-group">
            <label>Tipo:</label>
            <input type="text" name="tipo" value="${ticket.tipo}">
          </div>
          <div class="form-group">
            <label>Descripción:</label>
            <textarea name="descripcion">${ticket.descripcion}</textarea>
          </div>
          <div class="form-group">
            <label>Prioridad:</label>
            <select name="prioridad">
              <option value="baja" ${ticket.prioridad === 'baja' ? 'selected' : ''}>Baja</option>
              <option value="media" ${ticket.prioridad === 'media' ? 'selected' : ''}>Media</option>
              <option value="alta" ${ticket.prioridad === 'alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>
          <div class="form-group">
            <label>Estado:</label>
            <select name="estado">
              <option value="asignado" ${ticket.estado === 'asignado' ? 'selected' : ''}>Asignado</option>
              <option value="en progreso" ${ticket.estado === 'en progreso' ? 'selected' : ''}>En Progreso</option>
              <option value="resuelto" ${ticket.estado === 'resuelto' ? 'selected' : ''}>Resuelto</option>
              <option value="cerrado" ${ticket.estado === 'cerrado' ? 'selected' : ''}>Cerrado</option>
            </select>
          </div>
          <div class="modal-buttons">
            <button type="button" class="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn-guardar">Guardar</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector(".btn-cancelar").addEventListener("click", () => {
      modal.remove();
    });
    
    const editForm = modal.querySelector("#edit-form");
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(editForm);
      const updatedData = {
        edificio: formData.get("edificio"),
        espacio: formData.get("espacio"),
        tipo: formData.get("tipo"),
        descripcion: formData.get("descripcion"),
        prioridad: formData.get("prioridad"),
        estado: formData.get("estado")
      };
      
      updateTicket(index, updatedData);
      modal.remove();
      loadTickets();
    });
  };

  // Manejo del envío del formulario principal de ticket
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const ticket = {
        edificio: form.edificio.value,
        espacio: form.espacio.value,
        tipo: form.tipo.value,
        descripcion: form.descripcion.value,
        prioridad: form.prioridad.value,
        // Extrae sólo el nombre del archivo (no la ruta)
        archivo: form.archivo.value.split("\\").pop() || null,
      };
      const ticketNumber = saveTicket(ticket);
      // Redirige a página de confirmación con el número en query string
      window.location.href = `confirmacion-ticket.html?n=${ticketNumber}`;
    });
  }

  // Inicializar listado al cargar la página
  loadTickets();
});