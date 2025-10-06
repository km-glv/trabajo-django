// mis-reservas-django.js - calendario para Django
function getReservations(){
  // En Django, obtenemos los datos del window.djangoData
  return window.djangoData?.reservations || {};
}

// Reusar la generación de franjas (09:00-18:00, 45min)
const days = ['Hora','Lunes','Martes','Miércoles','Jueves','Viernes'];
function generateTimeSlots(start,end,interval){
  const slots=[];
  let current = new Date(`1970-01-01T${start}:00`);
  const endTime = new Date(`1970-01-01T${end}:00`);
  while(current<endTime){
    const next = new Date(current.getTime()+interval*60000);
    const startStr = current.toTimeString().slice(0,5);
    const endStr = next.toTimeString().slice(0,5);
    slots.push(`${startStr} - ${endStr}`);
    current = next;
  }
  return slots;
}

const timeSlots = generateTimeSlots('09:00','18:00',45);

function buildKey(day,slot,professional){
  if(professional) return `${day}|${slot}|${professional}`;
  return `${day}|${slot}`;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0) ? -6 : (1 - day);
  d.setDate(d.getDate() + diff); d.setHours(0,0,0,0);
  return d;
}
let currentWeekStart = startOfWeek(new Date());

function updateCalendarMonthLabel(){
  const monthEl = document.getElementById('calendar-month');
  if(monthEl){
    const opts = { year:'numeric', month:'long' };
    monthEl.textContent = currentWeekStart.toLocaleDateString(undefined, opts);
  }
}

function renderCalendar(){
  const calendar = document.getElementById('calendar');
  if (!calendar) return;
  calendar.innerHTML='';
  // first header
  const timeHeader = document.createElement('div'); timeHeader.className='day-header'; timeHeader.textContent='Hora'; calendar.appendChild(timeHeader);
  // weekday headers with numbers
  const weekdayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  for(let i=0;i<weekdayNames.length;i++){
    const dayDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
    const dnum = dayDate.getDate();
    const h = document.createElement('div'); h.className='day-header'; h.innerHTML = '<div>'+weekdayNames[i]+'</div><div style="font-weight:600;font-size:13px">'+dnum+'</div>';
    calendar.appendChild(h);
  }

  const data = getReservations();
  const selectedUser = document.getElementById('user-select')?.value || '';

  timeSlots.forEach(slot=>{
    for(let i=0;i<days.length;i++){
      const cell = document.createElement('div');
      if(i===0){
        // Columna de horas
        cell.className='time-label';
        cell.textContent=slot;
      } else {
        // Celdas de días
        cell.className='hour-cell';
  const weekdayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  // compute ISO date para las celdas
  const dayDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + (i-1));
  const dateIso = dayDate.toISOString().slice(0,10);
  cell.dataset.day = dateIso;
        cell.dataset.slot = slot;
        
        // Buscar reservas para esta celda
        const keys = Object.keys(data).filter(k => {
          const parts = k.split('|');
          const dayIso = parts[0], slotTime = parts[1];
          return dayIso === cell.dataset.day && slotTime === slot;
        });
        
        if(keys.length > 0){
          // Preferir reservas propias: buscar la primera que sea 'owned'
          const ownedKey = keys.find(k => data[k] && data[k].owned);
          if(ownedKey){
            const reservation = data[ownedKey];
            cell.classList.add('reserved');
            cell.dataset.key = ownedKey;
            cell.title = `${reservation.name || ''} — ${reservation.professional || ''}`;
            cell.addEventListener('click', () => onCellClick(cell));
          } else {
            // No hay reservas propias en esta celda - no mostrar reservas de otros usuarios
            // (en la vista 'Mis Reservas' ocultamos las reservas de terceros por privacidad)
          }
        }
      }
      calendar.appendChild(cell);
    }
  });
}

function renderList(){
  const container = document.getElementById('my-reservations-list');
  if (!container) return;
  
  const data = getReservations();
  const selectedUser = document.getElementById('user-select')?.value || '';
  
  container.innerHTML='';
  let keys = Object.keys(data);
  
  // filtrar por usuario seleccionado si hay uno
  if(selectedUser){
    keys = keys.filter(k => data[k].email === selectedUser);
  }

  // En esta vista solo mostramos las reservas propias (evitar mostrar reservas de otros usuarios)
  keys = keys.filter(k => data[k] && data[k].owned);

// prev/next handlers were moved to DOMContentLoaded to ensure they are attached once
  
  if(keys.length===0){
    container.innerHTML = '<p>No hay reservas.</p>';
    return;
  }
  
  // Deduplicate by reservation id (some data sources may contain duplicates)
  const uniqueKeys = [];
  const seenIds = new Set();
  keys.forEach(k=>{
    const r = data[k];
    const id = r && r.id ? String(r.id) : null;
    const fingerprint = id || k; // fallback to key if no id
    if(!seenIds.has(fingerprint)){
      seenIds.add(fingerprint);
      uniqueKeys.push(k);
    }
  });

  keys = uniqueKeys;

  keys.sort((a,b)=>{
    const ta = new Date(data[a].createdAt || data[a].fecha || 0).getTime();
    const tb = new Date(data[b].createdAt || data[b].fecha || 0).getTime();
    return ta - tb;
  });
  keys.forEach(k=>{
    const r = data[k];
    const item = document.createElement('div');
    item.className='reservation-item';
    item.dataset.key = k;
    const dayLabel = r.day || r.date || (r.fecha ? new Date(r.fecha).toLocaleDateString() : '');
    item.innerHTML = `
      <strong>${r.name || r.usuario || 'Usuario'}</strong>
      <div class="reservation-meta">${dayLabel} ${r.slot}</div>
      <div class="reservation-meta">${r.professional || ''}${r.notes? ' — '+r.notes:''}</div>
    `;
    
    // Agregar evento click para resaltar en calendario
    item.addEventListener('click', () => scrollToReservation(k));
    
    container.appendChild(item);
  });
}

// Helper: obtain CSRF token from cookie
function getCookie(name) {
  const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return v ? v.pop() : '';
}

// Add delete button to owned reservations and wire handler
function attachDeleteButtons(){
  const data = getReservations();
  document.querySelectorAll('.reservation-item').forEach(item=>{
    const key = item.dataset.key;
    const r = data[key];
    if(!r) return;
    // Only add a delete button for owned reservations
    if(r.owned){
      // avoid adding multiple buttons
      if(item.querySelector('.btn-delete')) return;
      const btn = document.createElement('button');
      btn.className = 'btn btn-danger btn-delete';
      btn.textContent = 'Eliminar';
      btn.style.marginLeft = '8px';
      btn.addEventListener('click', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(!confirm('¿Eliminar esta reserva?')) return;
        try{
          const csrftoken = getCookie('csrftoken');
          const resp = await fetch(`/reservas/delete/${r.id}/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrftoken
            },
            body: JSON.stringify({})
          });
          const result = await resp.json();
          if(result.ok){
            // refresh data: refetch reservations from server if endpoint available
            try{
              const mapResp = await fetch('/reservas/map/');
              if(mapResp.ok){
                const newMap = await mapResp.json();
                window.djangoData = window.djangoData || {};
                window.djangoData.reservations = newMap;
              }
            }catch(e){ console.warn('No se pudo refrescar mapa:', e); }
            renderList(); renderCalendar(); attachDeleteButtons();
            if(window.UI_MODAL) UI_MODAL.alert('Reserva eliminada correctamente.', 'Hecho');
          } else {
            alert(result.error || 'No se pudo eliminar la reserva');
          }
        }catch(err){
          console.error(err);
          alert('Error al eliminar la reserva');
        }
      });
      item.appendChild(btn);
    }
  });
}

function onCellClick(cell){
  // si la celda tiene data-key (la asignamos al renderizar), usarla
  const data = getReservations();
  const key = cell.dataset.key;
  if(!key || !data[key]) return; // no hacer nada si está vacía
  
  // Mostrar detalles de la reserva
  const r = data[key];
  const message = `
    <p><strong>Nombre:</strong> ${r.name}</p>
    <p><strong>Email:</strong> ${r.email}</p>
    <p><strong>Profesional:</strong> ${r.professional}</p>
    <p><strong>Día:</strong> ${r.day}</p>
    <p><strong>Horario:</strong> ${r.slot}</p>
    ${r.notes ? `<p><strong>Notas:</strong> ${r.notes}</p>` : ''}
  `;
  
  if (window.UI_MODAL) {
    UI_MODAL.alert(message, 'Detalles de la reserva');
  } else {
    alert(`Reserva: ${r.name} - ${r.day} ${r.slot}`);
  }
}

function scrollToReservation(key){
  // resaltar celda correspondiente en calendario
  document.querySelectorAll('.hour-cell').forEach(c=>c.classList.remove('selected'));
  const cell = document.querySelector(`.hour-cell[data-key="${key}"]`);
  if(cell){
    cell.classList.add('selected');
    cell.scrollIntoView({behavior: 'smooth', block: 'center'});
  }
  
  // resaltar en lista
  document.querySelectorAll('.reservation-item').forEach(el=>el.classList.remove('highlight'));
  const item = document.querySelector(`.reservation-item[data-key="${key}"]`);
  if(item) item.classList.add('highlight');
}

// evento para filtrar reservas
document.getElementById('filter-reservations')?.addEventListener('click', ()=>{
  renderList();
  renderCalendar();
});

// evento para cambio en selector de usuario
document.getElementById('user-select')?.addEventListener('change', ()=>{
  renderList();
  renderCalendar();
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  renderCalendar();
  renderList();
  attachDeleteButtons();

  // Attach prev/next handlers once
  document.getElementById('prev-week')?.addEventListener('click', ()=>{
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateCalendarMonthLabel(); renderCalendar();
  });
  document.getElementById('next-week')?.addEventListener('click', ()=>{
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateCalendarMonthLabel(); renderCalendar();
  });

  // initialize month label
  updateCalendarMonthLabel();
});