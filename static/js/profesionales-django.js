// profesionales-django.js - adaptado para Django
const calendar = document.getElementById('calendar');
const professionalSelect = document.getElementById('professional-select');
const appointmentsList = document.getElementById('appointments-list');

const days = ['Hora','Lunes','Martes','Miércoles','Jueves','Viernes'];

// Obtener datos del servidor
const { allReservations, professionals, timeSlots, currentProfessionalId, isSuperuser } = window.djangoData;

function renderCalendar(){
    calendar.innerHTML='';
    const selectedProfessionalId = professionalSelect ? professionalSelect.value : currentProfessionalId?.toString();
    
    // Headers
    days.forEach(day=>{
        const header = document.createElement('div');
        header.className='day-header';
        header.textContent=day;
        calendar.appendChild(header);
    });

    timeSlots.forEach(slot=>{
        for(let i=0;i<days.length;i++){
            const cell = document.createElement('div');
            if(i===0){
                cell.className='time-label';
                cell.textContent=slot;
            } else {
                cell.className='hour-cell';
                cell.dataset.day=days[i];
                cell.dataset.slot=slot;
                
                // Buscar reservas para el profesional seleccionado (o todas si es superuser sin filtro)
                let reservationsToShow;
                if(selectedProfessionalId && selectedProfessionalId !== '') {
                    reservationsToShow = allReservations.filter(r => r.professional_id == selectedProfessionalId);
                } else {
                    reservationsToShow = allReservations;
                }
                
                const reservation = reservationsToShow.find(r => 
                    r.day === days[i] && r.time_slot === slot
                );
                
                if(reservation){
                    cell.classList.add('reserved');
                    cell.title = `${reservation.user_name} — ${reservation.user_email}${reservation.notes ? ' — ' + reservation.notes : ''}`;
                }
            }
            calendar.appendChild(cell);
        }
    });
}

function updateAppointmentsList(){
    if(!appointmentsList) return;
    
    const selectedProfessionalId = professionalSelect ? professionalSelect.value : currentProfessionalId?.toString();
    const items = appointmentsList.querySelectorAll('.reservation-item');
    
    items.forEach(item => {
        const itemProfessionalId = item.dataset.professional;
        if(selectedProfessionalId && selectedProfessionalId !== '') {
            item.style.display = (itemProfessionalId === selectedProfessionalId) ? 'block' : 'none';
        } else {
            item.style.display = 'block';
        }
    });
}

// Event listeners
if(professionalSelect && isSuperuser){
    professionalSelect.addEventListener('change', () => {
        renderCalendar();
        updateAppointmentsList();
    });
}

// Inicializar
renderCalendar();
updateAppointmentsList();
