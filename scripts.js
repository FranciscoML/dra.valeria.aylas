// ================================================================
//  REEMPLAZA el bloque <script>...</script> al final del index.html
//  ÚNICO cambio obligatorio: pega tu URL real en APPS_SCRIPT_URL
// ================================================================

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwt58x0Tk5M6sdm87REJRmA-qIlrSiZbiGSjge7UDFaBOP9idAibKADSQisHrzvjL9F0Q/exec';
var WA_NUMBER = '51986962950';

// ── Nav scroll ────────────────────────────────────────────────
var nav = document.getElementById('mainNav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Hamburger ─────────────────────────────────────────────────
var hamburger = document.getElementById('hamburger');
var navLinks  = document.getElementById('navLinks');
hamburger.addEventListener('click', function() { navLinks.classList.toggle('open'); });
navLinks.querySelectorAll('a').forEach(function(a) {
  a.addEventListener('click', function() { navLinks.classList.remove('open'); });
});

// ── Scroll reveal ─────────────────────────────────────────────
var revealOb = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry, i) {
    if (entry.isIntersecting)
      setTimeout(function() { entry.target.classList.add('visible'); }, i * 80);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(function(el) { revealOb.observe(el); });

// ── Fecha mínima = hoy ────────────────────────────────────────
var dateInput  = document.querySelector('input[name="date"]');
var timeSelect = document.querySelector('select[name="time"]');
var today = new Date();
if (dateInput) dateInput.setAttribute('min',
  today.getFullYear() + '-' +
  String(today.getMonth()+1).padStart(2,'0') + '-' +
  String(today.getDate()).padStart(2,'0')
);

// ── Slots disponibles ─────────────────────────────────────────
// IMPORTANTE: deben coincidir EXACTAMENTE con los <option value=""> del HTML
var ALL_TIMES = ['08:00','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function resetTimeOptions(ocupados) {
  ocupados = ocupados || [];
  timeSelect.innerHTML = '<option value="">Seleccionar hora</option>';
  ALL_TIMES.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t;
    var h = parseInt(t);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12  = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    opt.textContent = String(h12).padStart(2,'0') + ':00 ' + ampm;
    if (ocupados.includes(t)) {
      opt.disabled = true;
      opt.textContent += ' — Ocupado';
      opt.style.color = '#bbb';
    }
    timeSelect.appendChild(opt);
  });
}

// ── Disponibilidad en tiempo real ─────────────────────────────
if (dateInput) {
  dateInput.addEventListener('change', async function() {
    var fecha = dateInput.value;
    if (!fecha) return;

    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option>Verificando disponibilidad...</option>';

    try {
      var r = await fetch(APPS_SCRIPT_URL + '?action=disponibilidad&fecha=' + fecha);
      var j = await r.json();
      var ocupados = (j.data && Array.isArray(j.data.ocupados)) ? j.data.ocupados : [];
      resetTimeOptions(ocupados);
    } catch(err) {
      console.warn('No se pudo consultar disponibilidad:', err);
      resetTimeOptions([]);
    }

    timeSelect.disabled = false;
  });
}

// ── Formulario ────────────────────────────────────────────────
var form      = document.getElementById('appointmentForm');
var statusEl  = document.getElementById('form-status');
var submitBtn = document.getElementById('submitBtn');

function mostrarStatus(msg, tipo) {
  statusEl.textContent = msg;
  statusEl.className   = tipo;
  submitBtn.classList.remove('loading');
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(form));

  if (['name','email','phone','date','time','service'].some(function(k) {
    return !data[k] || !data[k].trim();
  })) {
    mostrarStatus('Por favor completa todos los campos requeridos.', 'error');
    return;
  }

  submitBtn.textContent = 'Agendando cita...';
  submitBtn.classList.add('loading');
  statusEl.textContent = '';

  var nc = data.name + (data.lastname ? ' ' + data.lastname : '');
  var waMsg = encodeURIComponent(
    'Nueva solicitud de cita\n\n' +
    'Paciente: ' + nc          + '\n' +
    'Email: '    + data.email  + '\n' +
    'Telefono: ' + data.phone  + '\n' +
    'Fecha: '    + data.date   + '\n' +
    'Hora: '     + data.time   + '\n' +
    'Servicio: ' + data.service + '\n' +
    'Notas: '    + (data.notes || 'Ninguna')
  );
  var waURL = 'https://wa.me/' + WA_NUMBER + '?text=' + waMsg;

  try {
    var res  = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      body:    JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    var j = await res.json();

    if (j.success) {
      mostrarStatus('¡Cita confirmada! Revisa tu email. Abriendo WhatsApp...', 'success');
      submitBtn.textContent = '¡Cita confirmada!';
      form.reset();
      resetTimeOptions([]);
      setTimeout(function() { window.open(waURL, '_blank'); }, 900);
      return;
    } else {
      mostrarStatus(j.message || 'Error al agendar. Intenta por WhatsApp.', 'error');
      submitBtn.textContent = 'Confirmar cita →';
      return;
    }
  } catch(err) {
    console.warn('Apps Script no disponible, usando WhatsApp:', err);
    window.open(waURL, '_blank');
    mostrarStatus('Solicitud enviada por WhatsApp.', 'success');
    submitBtn.textContent = 'Enviado';
    form.reset();
  }
});