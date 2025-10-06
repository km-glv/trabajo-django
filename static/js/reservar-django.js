// reservar-django.js - small, robust calendar for Django reservar page

document.addEventListener('DOMContentLoaded', function () {
  // Elements
  var calendar = document.getElementById('calendar');
  if (!calendar) return; // nothing to do

  var professionalSelect = document.getElementById('q-professional') || document.getElementById('profesional_id');
  var selectedSlotEl = document.getElementById('selected-slot');

  // Hidden form fields (optional; template may or may not include them)
  var hiddenDay = document.getElementById('selected-day');
  var hiddenTime = document.getElementById('selected-time');
  var hiddenFecha = document.getElementById('fecha') || document.querySelector('input[name="fecha"]');

  // days and slots config (weekday labels will be combined with day numbers)
  var WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  function generateTimeSlots(start, end, intervalMinutes) {
    var slots = [];
    var current = new Date('1970-01-01T' + start + ':00');
    var endTime = new Date('1970-01-01T' + end + ':00');
    while (current < endTime) {
      var next = new Date(current.getTime() + intervalMinutes * 60000);
      var s = current.toTimeString().slice(0, 5);
      var e = next.toTimeString().slice(0, 5);
      slots.push(s + ' - ' + e);
      current = next;
    }
    return slots;
  }

  var timeSlots = generateTimeSlots('09:00', '18:00', 45);

  // read reservations passed by Django into window.djangoData.reservations
  function readReservations() {
    if (window.djangoData && window.djangoData.reservations) return window.djangoData.reservations;
    // fallback: try to read a pre#reservations-json or #debug-reservations
    var pre = document.getElementById('reservations-json') || document.getElementById('debug-reservations');
    if (pre && pre.textContent) {
      try { return JSON.parse(pre.textContent); } catch (e) { console.warn('reservar-django: invalid JSON in debug block'); }
    }
    return {};
  }

  var reservations = readReservations();

  // Polling: periodically fetch latest reservations from server and update view
  var RESERVAS_MAP_URL = '/reservas/map/';
  function fetchReservationsMap(){
    fetch(RESERVAS_MAP_URL, { credentials: 'same-origin' })
      .then(function(resp){ if(!resp.ok) throw new Error('network'); return resp.json(); })
      .then(function(data){
        // simple deep-equality check by JSON
        try{
          var oldStr = JSON.stringify(reservations);
          var newStr = JSON.stringify(data);
          if (oldStr !== newStr){
            reservations = data;
            renderCalendar();
          }
        }catch(e){ reservations = data; renderCalendar(); }
      }).catch(function(err){ /* ignore network errors silently */ });
  }
  // start polling every 5s
  setInterval(fetchReservationsMap, 5000);
  // also fetch once at startup to ensure freshness if server-side JSON differs
  fetchReservationsMap();

  // Helper to build key used by server-side: 'Dia|Slot|Profesional' or 'Dia|Slot'
  function buildKey(day, slot, professional) {
    if (professional) return day + '|' + slot + '|' + professional;
    return day + '|' + slot;
  }

  var currentSelection = null;
  // week navigation state: currentWeekStart will be a Date representing Monday of the visible week
  function startOfWeek(date) {
    var d = new Date(date);
    var day = d.getDay(); // 0=Sun..6=Sat
    var diff = (day === 0) ? -6 : (1 - day); // move to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }
  var currentWeekStart = startOfWeek(new Date());


  function clearSelection() {
    document.querySelectorAll('#calendar .hour-cell.selected').forEach(function (c) { c.classList.remove('selected'); });
    currentSelection = null;
    if (selectedSlotEl) selectedSlotEl.textContent = 'Ninguno';
    if (hiddenDay) hiddenDay.value = '';
    if (hiddenTime) hiddenTime.value = '';
    if (hiddenFecha) hiddenFecha.value = '';
  }

  function selectCell(cell) {
    if (!cell || cell.classList.contains('reserved')) return;
    // deselect previous
    document.querySelectorAll('#calendar .hour-cell.selected').forEach(function (c) { c.classList.remove('selected'); });
    cell.classList.add('selected');
    currentSelection = { day: cell.dataset.day, slot: cell.dataset.slot };
    if (selectedSlotEl) selectedSlotEl.textContent = currentSelection.day + ' — ' + currentSelection.slot;
    if (hiddenDay) hiddenDay.value = currentSelection.day;
    if (hiddenTime) hiddenTime.value = currentSelection.slot;
    // set the hidden datetime-local field using the column date stored in dataset.day
    if (hiddenFecha) {
      try {
        var dateIso = cell.dataset.day; // YYYY-MM-DD
        var timeStr = currentSelection.slot.split(' - ')[0]; // HH:MM
        hiddenFecha.value = dateIso + 'T' + timeStr;
      } catch (e) { /* ignore */ }
    }
  }

  // ensure the form requires a selected slot before submit
  var theForm = document.querySelector('.reservations-container form') || document.querySelector('.reservation-form form') || document.querySelector('form');
  if (theForm) {
    theForm.addEventListener('submit', function (ev) {
      if (!hiddenFecha || !hiddenFecha.value) {
        ev.preventDefault();
        if (window.UI_MODAL) UI_MODAL.alert('Selecciona primero una franja horaria en el calendario.');
        else alert('Selecciona primero una franja horaria en el calendario.');
        return false;
      }
      return true;
    });
  }

  function renderCalendar() {
    // update month label
    var monthEl = document.getElementById('calendar-month');
    if (monthEl) {
      var opts = { year: 'numeric', month: 'long' };
      monthEl.textContent = currentWeekStart.toLocaleDateString(undefined, opts);
    }
    calendar.innerHTML = '';
    // headers with day numbers
    var headerRow = [];
    // first header is 'Hora'
    var timeHeader = document.createElement('div'); timeHeader.className = 'day-header'; timeHeader.textContent = 'Hora'; calendar.appendChild(timeHeader);

    // compute week days starting from currentWeekStart
    for (var i = 0; i < WEEKDAY_NAMES.length; i++) {
      var dayDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + i);
      var dayName = WEEKDAY_NAMES[i];
      var dayNum = dayDate.getDate();
      var h = document.createElement('div');
      h.className = 'day-header';
      h.innerHTML = '<div>' + dayName + '</div><div style="font-weight:600;font-size:13px">' + dayNum + '</div>';
      calendar.appendChild(h);
    }

    var selectedProfessional = professionalSelect ? professionalSelect.value : '';
    // server-side reservations keys use professional.nombre (e.g. "Dr. María González - Psicología Clínica").
    // If the select's value is an id, derive the name from the option text.
    var selectedProfessionalName = selectedProfessional;
    if (professionalSelect && professionalSelect.selectedIndex >= 0) {
      try {
        var optText = professionalSelect.options[professionalSelect.selectedIndex].text || '';
        // option text is like "Nombre - Especialidad" in the template
        selectedProfessionalName = optText.split(' - ')[0].trim() || selectedProfessional;
      } catch (e) { selectedProfessionalName = selectedProfessional; }
    }

    timeSlots.forEach(function (slot) {
      // iterate 0..WEEKDAY_NAMES.length (0=time column)
      for (var i = 0; i <= WEEKDAY_NAMES.length; i++) {
        var cell = document.createElement('div');
        if (i === 0) {
          cell.className = 'time-label';
          cell.textContent = slot;
        } else {
          cell.className = 'hour-cell';
          var day = WEEKDAY_NAMES[i-1];
          // compute ISO date string for this column (YYYY-MM-DD)
          var dayDate = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate() + (i-1));
          var dateIso = dayDate.toISOString().slice(0,10);
          cell.dataset.day = dateIso; // store ISO date, not weekday name
          cell.dataset.slot = slot;

          // determine if reserved for selected professional or any if none selected
          var reserved = false;
          var reservedType = null; // 'selected' => reserved for selected professional, 'other' => reserved for someone else
          // exact match including professional
          // build key using dateIso and profesional id (selectedProfessional contains id)
          var selectedProfessionalId = professionalSelect ? professionalSelect.value : '';
          var keyWithProf = buildKey(dateIso, slot, selectedProfessionalId);
          if (selectedProfessionalId) {
            if (reservations[keyWithProf]) {
              reserved = true; reservedType = 'selected';
              cell.title = String(reservations[keyWithProf].name || 'Reservado');
              cell.dataset.key = keyWithProf;
            } else {
              reserved = false;
            }
          } else {
            // no professional selected: mark any reservation on that date+slot
            var prefix = dateIso + '|' + slot;
            for (var k in reservations) {
              if (k.indexOf(prefix) === 0) { reserved = true; reservedType = 'other'; cell.title = String(reservations[k].name || 'Reservado'); cell.dataset.key = k; break; }
            }
          }
          if (reserved) {
            if (reservedType === 'selected') {
              // reserved slot that belongs to the currently selected professional -> red
              cell.classList.add('reserved-other');
            } else {
              // reserved by someone else -> accent (green)
              cell.classList.add('reserved');
            }
          }
          // click handler
          (function (c) {
            c.addEventListener('click', function () { selectCell(c); });
          })(cell);
        }
        calendar.appendChild(cell);
      }
    });
  }

  // prev/next handlers
  document.getElementById('prev-week')?.addEventListener('click', function(){
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });
  document.getElementById('next-week')?.addEventListener('click', function(){
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
  });

  // re-render when professional changes
  if (professionalSelect) {
    professionalSelect.addEventListener('change', function () { renderCalendar(); clearSelection(); });
  }

  // initial render
  renderCalendar();

  // expose a small API for debugging
  window._reservarCalendar = { render: renderCalendar, select: selectCell, clear: clearSelection };

  console.log('reservar-django: calendar initialized, slots:', timeSlots.length);
});