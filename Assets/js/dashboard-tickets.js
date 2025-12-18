// dashboard-tickets.js - VERSIÓN CORREGIDA
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuración de Supabase
const supabase = createClient(
  "https://wqfitbdetdyohbdxqfap.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZml0YmRldGR5b2hiZHhxZmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNzY0ODEsImV4cCI6MjA3OTk1MjQ4MX0.AJlbPq7sQN8XIyxEfUe4LRDm5y5y2RT1xPet3A7AxzY"
);

// Variables globales
let chartEdificios, chartEstados, chartPrioridades, chartRequerimientos, chartEvolucion;
let ticketsData = [];

// Función para cerrar sesión
window.cerrarSesion = function() {
  localStorage.removeItem('id_user');
  window.location.href = 'index.html';
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Dashboard iniciando...');
  try {
    await cargarDatos();
    configurarFiltros();
    console.log('✅ Dashboard cargado correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar dashboard:', error);
    mostrarError('Error al inicializar el dashboard: ' + error.message);
  }
});

// Cargar datos de tickets
async function cargarDatos(fechaInicio = null, fechaTermino = null) {
  console.log('📊 Cargando datos de tickets...');
  console.log('Filtros:', { fechaInicio, fechaTermino });
  
  try {
    let query = supabase
      .from('ticket')
      .select('*')
      .order('fecha_solicitud', { ascending: false });

    console.log('⚠️ Usando query simplificada para debugging');

    if (fechaInicio) {
      const fechaInicioStr = fechaInicio + 'T00:00:00.000Z';
      query = query.gte('fecha_solicitud', fechaInicioStr);
      console.log('Filtro desde:', fechaInicioStr);
    }
    
    if (fechaTermino) {
      const fechaTerminoStr = fechaTermino + 'T23:59:59.999Z';
      query = query.lte('fecha_solicitud', fechaTerminoStr);
      console.log('Filtro hasta:', fechaTerminoStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error en query de Supabase:', error);
      throw error;
    }

    console.log('✅ ' + data.length + ' tickets cargados desde Supabase');
    console.log('Muestra de datos:', data.slice(0, 2));

    ticketsData = await cargarRelaciones(data);
    
    calcularKPIs();
    generarGraficos();
    mostrarTicketsCriticos();
  } catch (error) {
    console.error('❌ Error en cargarDatos:', error);
    mostrarError('Error al cargar los datos de tickets: ' + error.message);
  }
}

// Función para cargar relaciones por separado
async function cargarRelaciones(tickets) {
  console.log('🔗 Cargando relaciones...');
  
  try {
    const espacioIds = [...new Set(tickets.map(t => t.id_espacio).filter(id => id))];
    const requerimientoIds = [...new Set(tickets.map(t => t.id_requerimiento).filter(id => id))];
    const usuarioIds = [...new Set(tickets.map(t => t.id_Creador).filter(id => id))];
    const tecnicoIds = [...new Set(tickets.map(t => t.id_tecnico).filter(id => id))];
    
    console.log('IDs a buscar:', { 
      espacios: espacioIds.length, 
      requerimientos: requerimientoIds.length, 
      usuarios: usuarioIds.length, 
      tecnicos: tecnicoIds.length 
    });
    
    let espaciosMap = {};
    if (espacioIds.length > 0) {
      const { data: espacios, error: errorEspacios } = await supabase
        .from('espacio')
        .select('id_espacio, nombre_espacio, id_edificio, edificio:id_edificio(nombre_edificio)')
        .in('id_espacio', espacioIds);
      
      if (errorEspacios) {
        console.error('Error cargando espacios:', errorEspacios);
      } else {
        espaciosMap = Object.fromEntries(espacios.map(e => [e.id_espacio, e]));
        console.log('✅ Espacios cargados:', espacios.length);
      }
    }
    
    let requerimientosMap = {};
    if (requerimientoIds.length > 0) {
      const { data: requerimientos, error: errorReq } = await supabase
        .from('requerimiento')
        .select('id_requerimiento, nombre_requerimiento')
        .in('id_requerimiento', requerimientoIds);
      
      if (errorReq) {
        console.error('Error cargando requerimientos:', errorReq);
      } else {
        requerimientosMap = Object.fromEntries(requerimientos.map(r => [r.id_requerimiento, r]));
        console.log('✅ Requerimientos cargados:', requerimientos.length);
      }
    }
    
    let usuariosMap = {};
    if (usuarioIds.length > 0) {
      const { data: usuarios, error: errorUsuarios } = await supabase
        .from('usuario')
        .select('id_user, nombre, apellido')
        .in('id_user', usuarioIds);
      
      if (errorUsuarios) {
        console.error('Error cargando usuarios:', errorUsuarios);
      } else {
        usuariosMap = Object.fromEntries(usuarios.map(u => [u.id_user, u]));
        console.log('✅ Usuarios cargados:', usuarios.length);
      }
    }
    
    let tecnicosMap = {};
    if (tecnicoIds.length > 0) {
      const { data: tecnicos, error: errorTecnicos } = await supabase
        .from('tecnicos')
        .select('id_tecnico, nombre_tecnico')
        .in('id_tecnico', tecnicoIds);
      
      if (errorTecnicos) {
        console.error('Error cargando técnicos:', errorTecnicos);
      } else {
        tecnicosMap = Object.fromEntries(tecnicos.map(t => [t.id_tecnico, t]));
        console.log('✅ Técnicos cargados:', tecnicos.length);
      }
    }
    
    const ticketsConRelaciones = tickets.map(ticket => {
      return {
        ...ticket,
        espacio: espaciosMap[ticket.id_espacio] || null,
        requerimiento: requerimientosMap[ticket.id_requerimiento] || null,
        creador: usuariosMap[ticket.id_Creador] || null,
        tecnico: tecnicosMap[ticket.id_tecnico] || null
      };
    });
    
    console.log('✅ Relaciones combinadas');
    return ticketsConRelaciones;
    
  } catch (error) {
    console.error('❌ Error en cargarRelaciones:', error);
    return tickets;
  }
}

// Calcular KPIs
function calcularKPIs() {
  console.log('🧮 Calculando KPIs...');
  
  try {
    const totalTickets = ticketsData.length;
    console.log('Total tickets:', totalTickets);
    
    const activos = ticketsData.filter(t => t.estado === 'pendiente' || t.estado === 'en proceso').length;
    const cerrados = ticketsData.filter(t => t.estado === 'cerrado').length;
    
    console.log('Activos:', activos, 'Cerrados:', cerrados);
    
    const tasaResolucion = totalTickets > 0 ? ((cerrados / totalTickets) * 100).toFixed(1) : 0;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const resueltosHoy = ticketsData.filter(t => {
      if (t.fecha_cierre_solicitud) {
        const fechaCierre = new Date(t.fecha_cierre_solicitud);
        return fechaCierre >= hoy;
      }
      return false;
    }).length;
    
    console.log('Resueltos hoy:', resueltosHoy);
    
    const ticketsAsignados = ticketsData.filter(t => t.id_tecnico);
    let tiempoPromedioAtencion = 0;
    if (ticketsAsignados.length > 0) {
      const totalHoras = ticketsAsignados.reduce((sum, ticket) => {
        const creacion = new Date(ticket.fecha_solicitud);
        const asignacion = ticket.fecha_cierre_solicitud ? new Date(ticket.fecha_cierre_solicitud) : new Date();
        const horas = Math.abs(asignacion - creacion) / 36e5;
        return sum + horas;
      }, 0);
      tiempoPromedioAtencion = (totalHoras / ticketsAsignados.length).toFixed(1);
    }
    
    console.log('Tiempo prom. atención:', tiempoPromedioAtencion + 'h');
    
    const ticketsCerrados = ticketsData.filter(t => t.estado === 'cerrado' && t.fecha_cierre_solicitud);
    let tiempoPromedioResolucion = 0;
    if (ticketsCerrados.length > 0) {
      const totalHoras = ticketsCerrados.reduce((sum, ticket) => {
        const creacion = new Date(ticket.fecha_solicitud);
        const cierre = new Date(ticket.fecha_cierre_solicitud);
        const horas = Math.abs(cierre - creacion) / 36e5;
        return sum + horas;
      }, 0);
      tiempoPromedioResolucion = (totalHoras / ticketsCerrados.length).toFixed(1);
    }
    
    console.log('Tiempo prom. resolución:', tiempoPromedioResolucion + 'h');
    console.log('Tickets cerrados con fecha:', ticketsCerrados.length);
    
    const alta = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'alta').length;
    const media = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'media').length;
    const baja = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'baja').length;
    
    console.log('Por prioridad - Alta:', alta, 'Media:', media, 'Baja:', baja);
    
    document.getElementById('kpi-total').textContent = totalTickets;
    document.getElementById('kpi-activos').textContent = activos;
    document.getElementById('kpi-resueltos').textContent = cerrados;
    document.getElementById('kpi-tasa').textContent = tasaResolucion + '%';
    document.getElementById('kpi-resueltos-hoy').textContent = resueltosHoy;
    document.getElementById('kpi-atencion').textContent = tiempoPromedioAtencion > 0 ? tiempoPromedioAtencion + 'h' : '--';
    document.getElementById('kpi-resolucion').textContent = tiempoPromedioResolucion > 0 ? tiempoPromedioResolucion + 'h' : '--';
    document.getElementById('kpi-prioridades').textContent = alta + ' / ' + media + ' / ' + baja;
    
    console.log('✅ KPIs actualizados en UI');
  } catch (error) {
    console.error('❌ Error en calcularKPIs:', error);
  }
}

// Generar gráficos
function generarGraficos() {
  console.log('📈 Generando gráficos...');
  try {
    generarGraficoEdificios();
    generarGraficoEstados();
    generarGraficoPrioridades();
    generarGraficoRequerimientos();
    generarGraficoEvolucion();
    console.log('✅ Gráficos generados');
  } catch (error) {
    console.error('❌ Error en generarGraficos:', error);
  }
}

// Gráfico de tickets por edificio
function generarGraficoEdificios() {
  const ctx = document.getElementById('chart-edificios');
  if (!ctx) {
    console.error('❌ No se encontró el canvas chart-edificios');
    return;
  }
  
  const edificiosCount = {};
  ticketsData.forEach(ticket => {
    const edificio = ticket.espacio?.edificio?.nombre_edificio || 'Sin edificio';
    edificiosCount[edificio] = (edificiosCount[edificio] || 0) + 1;
  });
  
  console.log('Edificios:', edificiosCount);
  
  const labels = Object.keys(edificiosCount);
  const data = Object.values(edificiosCount);
  
  if (chartEdificios) chartEdificios.destroy();
  
  chartEdificios = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tickets',
        data: data,
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// Gráfico de tickets por estado
function generarGraficoEstados() {
  const ctx = document.getElementById('chart-estados');
  if (!ctx) {
    console.error('❌ No se encontró el canvas chart-estados');
    return;
  }
  
  const pendientes = ticketsData.filter(t => t.estado === 'pendiente').length;
  const enProceso = ticketsData.filter(t => t.estado === 'en proceso').length;
  const cerrados = ticketsData.filter(t => t.estado === 'cerrado').length;
  
  console.log('Estados - Pendiente:', pendientes, 'En proceso:', enProceso, 'Cerrado:', cerrados);
  
  if (chartEstados) chartEstados.destroy();
  
  chartEstados = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendiente', 'En Proceso', 'Cerrado'],
      datasets: [{
        data: [pendientes, enProceso, cerrados],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(16, 185, 129, 0.8)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(16, 185, 129, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}

// Gráfico de tickets por prioridad
function generarGraficoPrioridades() {
  const ctx = document.getElementById('chart-prioridades');
  if (!ctx) {
    console.error('❌ No se encontró el canvas chart-prioridades');
    return;
  }
  
  const alta = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'alta').length;
  const media = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'media').length;
  const baja = ticketsData.filter(t => t.prioridad && t.prioridad.toLowerCase() === 'baja').length;
  
  if (chartPrioridades) chartPrioridades.destroy();
  
  chartPrioridades = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Alta', 'Media', 'Baja'],
      datasets: [{
        data: [alta, media, baja],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(59, 130, 246, 1)'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8' }
        }
      }
    }
  });
}

// Gráfico de tickets por tipo de requerimiento
function generarGraficoRequerimientos() {
  const ctx = document.getElementById('chart-requerimientos');
  if (!ctx) {
    console.error('❌ No se encontró el canvas chart-requerimientos');
    return;
  }
  
  const requerimientosCount = {};
  ticketsData.forEach(ticket => {
    const req = ticket.requerimiento?.nombre_requerimiento || 'Sin tipo';
    requerimientosCount[req] = (requerimientosCount[req] || 0) + 1;
  });
  
  console.log('Requerimientos:', requerimientosCount);
  
  const labels = Object.keys(requerimientosCount);
  const data = Object.values(requerimientosCount);
  
  if (chartRequerimientos) chartRequerimientos.destroy();
  
  chartRequerimientos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tickets',
        data: data,
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { 
          beginAtZero: true,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// Gráfico de evolución en el tiempo
function generarGraficoEvolucion() {
  const ctx = document.getElementById('chart-evolucion');
  if (!ctx) {
    console.error('❌ No se encontró el canvas chart-evolucion');
    return;
  }
  
  const ticketsPorDia = {};
  ticketsData.forEach(ticket => {
    const fecha = new Date(ticket.fecha_solicitud);
    const dia = fecha.toISOString().split('T')[0];
    ticketsPorDia[dia] = (ticketsPorDia[dia] || 0) + 1;
  });
  
  console.log('Tickets por día:', ticketsPorDia);
  
  const diasOrdenados = Object.keys(ticketsPorDia).sort();
  const valores = diasOrdenados.map(dia => ticketsPorDia[dia]);
  
  if (chartEvolucion) chartEvolucion.destroy();
  
  chartEvolucion = new Chart(ctx, {
    type: 'line',
    data: {
      labels: diasOrdenados,
      datasets: [{
        label: 'Tickets creados',
        data: valores,
        borderColor: 'rgba(79, 70, 229, 1)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: '#94a3b8' }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        },
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' }
        }
      }
    }
  });
}

// Mostrar tabla de tickets críticos
function mostrarTicketsCriticos() {
  console.log('📋 Mostrando tickets críticos...');
  const tbody = document.getElementById('tabla-criticos');
  
  if (!tbody) {
    console.error('❌ No se encontró tabla-criticos');
    return;
  }
  
  const criticos = ticketsData.filter(t => {
    return t.prioridad && t.prioridad.toLowerCase() === 'alta' && (t.estado === 'pendiente' || t.estado === 'en proceso');
  });
  
  console.log('Tickets críticos encontrados: ' + criticos.length);
  
  if (criticos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--muted);">No hay tickets críticos activos</td></tr>';
    return;
  }
  
  tbody.innerHTML = criticos.map(ticket => {
    const fechaSolicitud = new Date(ticket.fecha_solicitud);
    const hoy = new Date();
    const diasAbierto = Math.floor((hoy - fechaSolicitud) / (1000 * 60 * 60 * 24));
    
    return '<tr><td>' + ticket.id_corto + '</td><td>' + (ticket.espacio?.edificio?.nombre_edificio || 'N/A') + '</td><td>' + (ticket.espacio?.nombre_espacio || 'N/A') + '</td><td>' + (ticket.requerimiento?.nombre_requerimiento || 'N/A') + '</td><td><span style="color: #ef4444; font-weight: 600;">' + ticket.prioridad + '</span></td><td>' + ticket.estado + '</td><td>' + diasAbierto + ' días</td></tr>';
  }).join('');
}

// Configurar filtros
function configurarFiltros() {
  console.log('⚙️ Configurando filtros...');
  
  const btnFiltrar = document.getElementById('btnFiltrar');
  const btnLimpiar = document.getElementById('btnLimpiarFiltro');
  
  if (!btnFiltrar || !btnLimpiar) {
    console.error('❌ No se encontraron botones de filtro');
    return;
  }
  
  btnFiltrar.addEventListener('click', () => {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaTermino = document.getElementById('fechaTermino').value;
    
    console.log('Aplicando filtros:', { fechaInicio, fechaTermino });
    
    if (fechaInicio && fechaTermino && fechaInicio > fechaTermino) {
      alert('La fecha de inicio no puede ser mayor que la fecha de término');
      return;
    }
    
    cargarDatos(fechaInicio, fechaTermino);
  });
  
  btnLimpiar.addEventListener('click', () => {
    console.log('Limpiando filtros');
    document.getElementById('fechaInicio').value = '';
    document.getElementById('fechaTermino').value = '';
    cargarDatos();
  });
  
  const btnDescargar = document.getElementById('btnDescargar');
  if (btnDescargar) {
    btnDescargar.addEventListener('click', descargarReporte);
  }
  
  console.log('✅ Filtros configurados');
}

// Descargar reporte
function descargarReporte() {
  console.log('📥 Descargando reporte...');
  
  if (ticketsData.length === 0) {
    alert('No hay datos para exportar');
    return;
  }
  
  const headers = ['ID Corto', 'Edificio', 'Espacio', 'Tipo Requerimiento', 'Descripción', 'Prioridad', 'Estado', 'Fecha Solicitud', 'Creador', 'Técnico Asignado', 'Fecha Cierre', 'Motivo Cierre'];
  
  const rows = ticketsData.map(ticket => {
    return [
      ticket.id_corto,
      ticket.espacio?.edificio?.nombre_edificio || '',
      ticket.espacio?.nombre_espacio || '',
      ticket.requerimiento?.nombre_requerimiento || '',
      ticket.descripcion || '',
      ticket.prioridad || '',
      ticket.estado || '',
      new Date(ticket.fecha_solicitud).toLocaleString('es-CL'),
      (ticket.creador?.nombre || '') + ' ' + (ticket.creador?.apellido || ''),
      ticket.tecnico ? ticket.tecnico.nombre_tecnico : '',
      ticket.fecha_cierre_solicitud ? new Date(ticket.fecha_cierre_solicitud).toLocaleString('es-CL') : '',
      ticket.motivo_cierre || ''
    ];
  });
  
  const csvContent = [headers.join(',')].concat(rows.map(row => row.map(cell => '"' + cell + '"').join(','))).join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'reporte_tickets_' + new Date().toISOString().split('T')[0] + '.csv');
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  console.log('✅ Reporte descargado');
}

// Mostrar errores
function mostrarError(mensaje) {
  console.error('❌ ERROR:', mensaje);
  
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; max-width: 400px;';
  alertDiv.innerHTML = '<strong>⚠️ Error</strong><br>' + mensaje;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}