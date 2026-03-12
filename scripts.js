/* ── CONFIG ── Pega aquí la URL real del Apps Script ── */
// ════════════════════════════════════════════════════════════
// REEMPLAZA esta URL con la que te dio Google Apps Script:
// Implementar → Ver implementaciones → copiar URL /exec
// ════════════════════════════════════════════════════════════
var SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyTp4SvvjyjeQtSYsY8-OZoeBym3gxHy7F21ltpdCAE4USRBcFz0AInntcyXELggOHxvw/exec';
var WA_NUM     = '51986962950';

/* ── NAV scroll ── */
var nav = document.getElementById('mainNav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 40);
});

/* ── Hamburger ── */
var hbg  = document.getElementById('hamburger');
var navL = document.getElementById('navLinks');
hbg.addEventListener('click', function() { navL.classList.toggle('open'); });
navL.querySelectorAll('a').forEach(function(a) {
  a.addEventListener('click', function() { navL.classList.remove('open'); });
});

/* ── Scroll reveal ── */
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e, i) {
    if (e.isIntersecting) setTimeout(function() { e.target.classList.add('visible'); }, i * 70);
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(function(el) { obs.observe(el); });

/* ── Fecha mínima = hoy ── */
var dateIn = document.querySelector('input[name="date"]');
var timeSel = document.querySelector('select[name="time"]');
var hoy = new Date();
if (dateIn) {
  var min = hoy.getFullYear()+'-'+String(hoy.getMonth()+1).padStart(2,'0')+'-'+String(hoy.getDate()).padStart(2,'0');
  dateIn.setAttribute('min', min);
}

/* ── Disponibilidad en tiempo real ── */
var HORAS = ['08:30','09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
function resetHoras(ocupados) {
  ocupados = ocupados || [];
  timeSel.innerHTML = '<option value="">Seleccionar hora</option>';
  HORAS.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t;
    var h = parseInt(t); var m = t.split(':')[1];
    var ampm = h >= 12 ? 'PM' : 'AM'; var h12 = h > 12 ? h-12 : (h===0?12:h);
    opt.textContent = String(h12).padStart(2,'0')+':'+m+' '+ampm;
    if (ocupados.includes(t)) { opt.disabled = true; opt.textContent += ' — Ocupado'; opt.style.color = '#bbb'; }
    timeSel.appendChild(opt);
  });
}

if (dateIn) {
  dateIn.addEventListener('change', async function() {
    var f = dateIn.value; if (!f) return;
    timeSel.disabled = true;
    timeSel.innerHTML = '<option>Verificando disponibilidad…</option>';
    try {
      var r = await fetch(SCRIPT_URL + '?action=disponibilidad&fecha=' + f);
      var j = await r.json();
      resetHoras(j.data && j.data.ocupados ? j.data.ocupados : []);
    } catch(e) { resetHoras(); }
    timeSel.disabled = false;
  });
}

/* ── Formulario ── */
var form    = document.getElementById('apptForm');
var statusEl = document.getElementById('fstatus');
var btn      = document.getElementById('fsubmit');

function setStatus(msg, tipo) {
  statusEl.textContent = msg;
  statusEl.className   = tipo;
  btn.classList.remove('loading');
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();
  var data = Object.fromEntries(new FormData(form));

  if (['name','email','phone','date','time','service'].some(function(k) {
    return !data[k] || !String(data[k]).trim();
  })) { setStatus('Por favor completa todos los campos requeridos.', 'err'); return; }

  btn.textContent = 'Enviando…';
  btn.classList.add('loading');
  statusEl.textContent = '';

  /* Mensaje WhatsApp de respaldo */
  var nc = data.name + (data.lastname ? ' ' + data.lastname : '');
  var waMsg = encodeURIComponent(
    'Nueva solicitud de cita\n\n' +
    'Paciente: ' + nc + '\n' +
    'Email: '    + data.email + '\n' +
    'Tel: '      + data.phone + '\n' +
    'Fecha: '    + data.date  + '\n' +
    'Hora: '     + data.time  + '\n' +
    'Servicio: ' + data.service + '\n' +
    'Notas: '    + (data.notes || 'Ninguna')
  );
  var waURL = 'https://wa.me/' + WA_NUM + '?text=' + waMsg;

  /* Llamada al Apps Script */
  try {
    var res  = await fetch(SCRIPT_URL, {
      method: 'POST',
      body:   JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
    var json = await res.json();

    if (json.success) {
      setStatus('✅ ¡Cita confirmada! Revisa tu email.', 'ok');
      btn.textContent = '¡Confirmado! ✓';
      form.reset(); resetHoras();
      setTimeout(function() { window.open(waURL, '_blank'); }, 800);
      return;
    } else {
      setStatus('⚠️ ' + json.message, 'err');
      btn.textContent = 'Confirmar cita →';
      return;
    }
  } catch(err) {
    /* Si el script falla, WhatsApp como respaldo */
    console.warn('Script no disponible, usando WhatsApp:', err);
    window.open(waURL, '_blank');
    setStatus('Solicitud enviada por WhatsApp.', 'ok');
    btn.textContent = 'Enviado ✓';
    form.reset();
  }
});