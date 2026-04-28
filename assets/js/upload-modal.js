/* ─── BTG Subir Factura — Modal Logic ─────────────────────────────────────── */
(function () {
  'use strict';

  // ── Change this URL if the backend runs on a different port ──
  var BACKEND_URL = '/api/upload-factura';

  // ── Populate month & year selects ─────────────────────────────
  var MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  (function populateSelects() {
    var selMes  = document.getElementById('facSelMes');
    var selAnio = document.getElementById('facSelAnio');
    if (!selMes || !selAnio) return;

    MONTHS.forEach(function (m, i) {
      var opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      selMes.appendChild(opt);
    });

    var now = new Date();
    for (var y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === now.getFullYear()) opt.selected = true;
      selAnio.appendChild(opt);
    }
  })();

  // ── Element references ─────────────────────────────────────────
  var overlay    = document.getElementById('facOverlay');
  var openBtn    = document.getElementById('facOpenBtn');
  var closeBtn   = document.getElementById('facCloseBtn');
  var cancelBtn  = document.getElementById('facCancelBtn');
  var form       = document.getElementById('facForm');
  var submitBtn  = document.getElementById('facSubmit');
  var formView   = document.getElementById('facFormView');
  var resultView = document.getElementById('facResult');

  var inNombre = document.getElementById('facNombre');
  var inCorreo = document.getElementById('facCorreo');
  var selMes   = document.getElementById('facSelMes');
  var selAnio  = document.getElementById('facSelAnio');
  var inMonto  = document.getElementById('facMonto');

  var dropPDF  = document.getElementById('facDropPDF');
  var dropXML  = document.getElementById('facDropXML');
  var filePDF  = document.getElementById('facFilePDF');
  var fileXML  = document.getElementById('facFileXML');

  // ── Open / Close ───────────────────────────────────────────────
  function openModal() {
    overlay.classList.add('open');
    setTimeout(function () { inNombre && inNombre.focus(); }, 80);
  }

  function closeModal() {
    overlay.classList.remove('open');
  }

  openBtn  && openBtn.addEventListener('click', openModal);
  closeBtn && closeBtn.addEventListener('click', closeModal);
  cancelBtn && cancelBtn.addEventListener('click', closeModal);

  overlay && overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
  });

  // ── Drop zone setup ────────────────────────────────────────────
  function setupDrop(dropEl, fileInput) {
    if (!dropEl || !fileInput) return;

    dropEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      dropEl.classList.add('dragover');
    });
    dropEl.addEventListener('dragleave', function () {
      dropEl.classList.remove('dragover');
    });
    dropEl.addEventListener('drop', function (e) {
      e.preventDefault();
      dropEl.classList.remove('dragover');
      var file = e.dataTransfer.files[0];
      if (file) applyFile(fileInput, dropEl, file);
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) applyFile(fileInput, dropEl, fileInput.files[0]);
    });
  }

  function applyFile(fileInput, dropEl, file) {
    try {
      var dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
    } catch (e) { /* Safari fallback — file already set via input */ }

    var fileEl  = dropEl.querySelector('.fac-drop-file');
    var textEl  = dropEl.querySelector('.fac-drop-filename');
    if (textEl) textEl.textContent = file.name;
    if (fileEl) fileEl.classList.add('show');
    dropEl.classList.remove('fac-error');
    clearErr(dropEl.id === 'facDropPDF' ? 'errPDF' : 'errXML');
  }

  setupDrop(dropPDF, filePDF);
  setupDrop(dropXML, fileXML);

  // "Cambiar" links inside drop zones
  document.querySelectorAll('.fac-drop-replace').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var targetId = btn.dataset.target;
      var inp = document.getElementById(targetId);
      if (inp) inp.click();
    });
  });

  // ── Validation helpers ─────────────────────────────────────────
  function setErr(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
  }
  function clearErr(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
  }
  function markInput(el, hasErr) {
    if (!el) return;
    el.classList.toggle('fac-error', hasErr);
  }

  function validateForm() {
    var ok = true;

    // Text fields
    var textFields = [
      { el: inNombre, id: 'errNombre', msg: 'Ingresa el nombre del agente.' },
      { el: inCorreo, id: 'errCorreo', msg: 'Ingresa el correo del agente.' },
      { el: inMonto,  id: 'errMonto',  msg: 'Ingresa el monto facturado.' },
    ];
    textFields.forEach(function (f) {
      if (!f.el || !f.el.value.trim()) {
        markInput(f.el, true);
        setErr(f.id, f.msg);
        ok = false;
      } else {
        markInput(f.el, false);
        clearErr(f.id);
      }
    });

    // Email format
    if (inCorreo && inCorreo.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inCorreo.value.trim())) {
      markInput(inCorreo, true);
      setErr('errCorreo', 'Ingresa un correo válido.');
      ok = false;
    }

    // Month / year
    if (!selMes || !selMes.value || !selAnio || !selAnio.value) {
      setErr('errMes', 'Selecciona el mes y año.');
      ok = false;
    } else {
      clearErr('errMes');
    }

    // Files
    if (!filePDF || !filePDF.files[0]) {
      if (dropPDF) dropPDF.classList.add('fac-error');
      setErr('errPDF', 'Selecciona el archivo PDF de la factura.');
      ok = false;
    } else {
      if (dropPDF) dropPDF.classList.remove('fac-error');
      clearErr('errPDF');
    }

    if (!fileXML || !fileXML.files[0]) {
      if (dropXML) dropXML.classList.add('fac-error');
      setErr('errXML', 'Selecciona el archivo XML del CFDI.');
      ok = false;
    } else {
      if (dropXML) dropXML.classList.remove('fac-error');
      clearErr('errXML');
    }

    return ok;
  }

  // ── Submit ─────────────────────────────────────────────────────
  form && form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    var mesTexto = selMes.value + ' ' + selAnio.value;

    var fd = new FormData();
    fd.append('nombre', inNombre.value.trim());
    fd.append('correo', inCorreo.value.trim());
    fd.append('mes',    mesTexto);
    fd.append('monto',  inMonto.value.trim());
    fd.append('pdf',    filePDF.files[0]);
    fd.append('xml',    fileXML.files[0]);

    try {
      var res  = await fetch(BACKEND_URL, { method: 'POST', body: fd });
      var data = await res.json();

      if (res.ok && data.folio) {
        showSuccess(data.folio);
      } else {
        showError(data.message || 'Ocurrió un error inesperado. Intenta de nuevo.');
      }
    } catch (err) {
      showError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  });

  // ── Result screens ─────────────────────────────────────────────
  function showSuccess(folio) {
    formView.style.display = 'none';
    resultView.className   = 'fac-result show';
    resultView.innerHTML   =
      '<div class="fac-result-icon ok">' +
        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '</div>' +
      '<div class="fac-result-title">Factura recibida</div>' +
      '<div class="fac-folio-badge">' + sanitize(folio) + '</div>' +
      '<div class="fac-result-msg">Tu factura fue recibida correctamente. El área de Operaciones la procesará en breve.</div>' +
      '<button class="fac-result-cta" id="facResultClose">Cerrar</button>';

    document.getElementById('facResultClose').addEventListener('click', function () {
      closeModal();
      setTimeout(resetModal, 400);
    });
  }

  function showError(msg) {
    formView.style.display = 'none';
    resultView.className   = 'fac-result show';
    resultView.innerHTML   =
      '<div class="fac-result-icon err">' +
        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</div>' +
      '<div class="fac-result-title">Error al enviar</div>' +
      '<div class="fac-result-msg">' + sanitize(msg) + '</div>' +
      '<button class="fac-result-cta" id="facResultRetry">Reintentar</button>';

    document.getElementById('facResultRetry').addEventListener('click', function () {
      resultView.className   = 'fac-result';
      formView.style.display = '';
    });
  }

  function resetModal() {
    if (form) form.reset();
    document.querySelectorAll('.fac-drop-file').forEach(function (el)  { el.classList.remove('show'); });
    document.querySelectorAll('.fac-drop').forEach(function (el)       { el.classList.remove('fac-error', 'dragover'); });
    document.querySelectorAll('.fac-input').forEach(function (el)      { el.classList.remove('fac-error'); });
    document.querySelectorAll('.fac-err').forEach(function (el)        { el.classList.remove('show'); });
    resultView.className   = 'fac-result';
    formView.style.display = '';
  }

  function sanitize(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

})();
