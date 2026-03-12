/* =============================================================
   scripts.js — Dra. Valeria Aylas · Agenda de citas
   v4 — Correcciones:
   · APPS_SCRIPT_URL con URL real (no placeholder)
   · Disponibilidad: fetch siempre activo con la URL real
   · resetTimeOptions recibe array y deshabilita slots ocupados
   ============================================================= */

// ── CONFIGURACIÓN ─────────────────────────────────────────────
// REEMPLAZA con tu URL real de Google Apps Script
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwt58x0Tk5M6sdm87REJRmA-qIlrSiZbiGSjge7UDFaBOP9idAibKADSQisHrzvjL9F0Q/exec';
var WA_NUMBER       = '51986962950';  // ← número real de WhatsApp

// ── INICIALIZACIÓN ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

  // Nav scroll
  var nav = document.getElementById('mainNav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Hamburger
  var hamburger = document.getElementById('hamburger');
  var navLinks  = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('open');
      });
    });
  }

  // Scroll reveal
  var revealOb = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, i) {
      if (entry.isIntersecting) {
        setTimeout(function () {
          entry.target.classList.add('visible');
        }, i * 80);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function (el) {
    revealOb.observe(el);
  });

  // ── FORMULARIO ─────────────────────────────────────────────
  var dateInput  = document.querySelector('input[name="date"]');
  var timeSelect = document.querySelector('select[name="time"]');
  var form       = document.getElementById('appointmentForm');
  var statusEl   = document.getElementById('form-status');
  var submitBtn  = document.getElementById('submitBtn');

  if (!dateInput || !timeSelect || !form) return;

  // Fecha mínima = hoy
  (function () {
    var d = new Date();
    dateInput.setAttribute('min',
      d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0')
    );
  })();

  // Slots de tiempo disponibles
  var ALL_TIMES = [
    '08:30','09:00','10:00','11:00',
    '12:00','14:00','15:00','16:00',
    '17:00','18:00','19:00','20:00'
  ];

  // Reconstruye el <select> marcando como disabled los slots ocupados
  function resetTimeOptions(ocupados) {
    ocupados = ocupados || [];
    timeSelect.innerHTML = '<option value="">Seleccionar hora</option>';
    ALL_TIMES.forEach(function (t) {
      var opt    = document.createElement('option');
      opt.value  = t;
      var parts  = t.split(':');
      var h      = parseInt(parts[0]);
      var m      = parts[1];
      var ampm   = h >= 12 ? 'PM' : 'AM';
      var h12    = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      opt.textContent = String(h12).padStart(2, '0') + ':' + m + ' ' + ampm;
      if (ocupados.includes(t)) {
        opt.disabled     = true;
        opt.textContent += ' — Ocupado';
        opt.style.color  = '#bbb';
      }
      timeSelect.appendChild(opt);
    });
  }

  // Al cambiar la fecha → consultar disponibilidad al Apps Script
  dateInput.addEventListener('change', async function () {
    var fecha = dateInput.value;
    if (!fecha) return;

    timeSelect.disabled = true;
    timeSelect.innerHTML = '<option>Verificando disponibilidad…</option>';

    // Si la URL está configurada, consultar; si no, mostrar todos los slots
    if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'https://script.google.com/macros/s/AKfycbwt58x0Tk5M6sdm87REJRmA-qIlrSiZbiGSjge7UDFaBOP9idAibKADSQisHrzvjL9F0Q/exec') {
      try {
        var r = await fetch(
          APPS_SCRIPT_URL + '?action=disponibilidad&fecha=' + fecha
        );
        var j = await r.json();
        var ocupados = (j.data && Array.isArray(j.data.ocupados))
          ? j.data.ocupados
          : [];
        resetTimeOptions(ocupados);
      } catch (err) {
        console.warn('No se pudo consultar disponibilidad:', err);
        resetTimeOptions([]);
      }
    } else {
      // Sin URL configurada: muestra todos los slots sin bloquear
      resetTimeOptions([]);
    }

    timeSelect.disabled = false;
  });

  // ── ENVÍO DEL FORMULARIO ──────────────────────────────────
  function mostrarStatus(msg, tipo) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.className   = tipo;
    }
    if (submitBtn) submitBtn.classList.remove('loading');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(form));

    // Validar campos requeridos
    var requeridos = ['name', 'email', 'phone', 'date', 'time', 'service'];
    var faltante = requeridos.find(function (k) {
      return !data[k] || !data[k].trim();
    });
    if (faltante) {
      mostrarStatus('Por favor completa todos los campos requeridos.', 'error');
      return;
    }

    if (submitBtn) {
      submitBtn.textContent = 'Agendando cita…';
      submitBtn.classList.add('loading');
    }
    if (statusEl) statusEl.textContent = '';

    // Mensaje WhatsApp de respaldo (siempre se prepara)
    var nc = data.name + (data.lastname ? ' ' + data.lastname : '');
    var waMsg = encodeURIComponent(
      'Nueva solicitud de cita\n\n' +
      'Paciente: ' + nc      + '\n' +
      'Email: '    + data.email  + '\n' +
      'Tel: '      + data.phone  + '\n' +
      'Fecha: '    + data.date   + '\n' +
      'Hora: '     + data.time   + '\n' +
      'Servicio: ' + data.service + '\n' +
      'Notas: '    + (data.notes || 'Ninguna')
    );
    var waURL = 'https://wa.me/' + WA_NUMBER + '?text=' + waMsg;

    // Intentar Apps Script si está configurado
    if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'https://script.google.com/macros/s/AKfycbwt58x0Tk5M6sdm87REJRmA-qIlrSiZbiGSjge7UDFaBOP9idAibKADSQisHrzvjL9F0Q/exec') {
      try {
        var res  = await fetch(APPS_SCRIPT_URL, {
          method:  'POST',
          body:    JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        });
        var json = await res.json();

        if (json.success) {
          mostrarStatus('¡Cita confirmada! Revisa tu email.', 'success');
          if (submitBtn) submitBtn.textContent = '¡Confirmado! ✓';
          form.reset();
          resetTimeOptions([]);
          setTimeout(function () { window.open(waURL, '_blank'); }, 900);
          return;
        } else {
          mostrarStatus(json.message || 'Ocurrió un error. Intenta por WhatsApp.', 'error');
          if (submitBtn) submitBtn.textContent = 'Confirmar cita →';
          return;
        }
      } catch (err) {
        console.warn('Apps Script no disponible, usando WhatsApp:', err);
      }
    }

    // Fallback: WhatsApp directo
    window.open(waURL, '_blank');
    mostrarStatus('Solicitud enviada por WhatsApp.', 'success');
    if (submitBtn) submitBtn.textContent = 'Enviado ✓';
    form.reset();
  });

}); // fin DOMContentLoaded