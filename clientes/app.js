'use strict';

// Todo el contenido dinámico se escribe con textContent (nunca innerHTML)
// y solo se aceptan links https, para que un dato mal cargado no sea un riesgo.

const $ = (sel) => document.querySelector(sel);
const CLAVE = 'redmas-localidad';

function el(tag, attrs = {}, texto) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (texto != null) n.textContent = texto;
  return n;
}

function urlSegura(u) {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' ? p.href : null;
  } catch { return null; }
}


function guardar(nombre) { try { localStorage.setItem(CLAVE, nombre); } catch {} }
function leer() { try { return localStorage.getItem(CLAVE); } catch { return null; } }
function borrar() { try { localStorage.removeItem(CLAVE); } catch {} }

let localidades = [];

function pintarDesplegable() {
  const sel = $('#localidad');
  sel.replaceChildren(el('option', { value: '', disabled: '', selected: '' }, 'Elegí tu localidad…'));
  const grupos = new Map();
  localidades.forEach((l, i) => {
    const prov = l.provincia && !String(l.provincia).startsWith('PENDIENTE') ? l.provincia : 'Otras';
    if (!grupos.has(prov)) grupos.set(prov, []);
    grupos.get(prov).push([l, i]);
  });
  const provs = [...grupos.keys()].sort((a, b) => (a === 'Otras') - (b === 'Otras') || a.localeCompare(b, 'es'));
  for (const prov of provs) {
    const g = el('optgroup', { label: prov });
    for (const [l, i] of grupos.get(prov)) {
      const o = el('option', { value: String(i) }, urlSegura(l.portal) ? l.nombre : l.nombre + ' (próximamente)');
      if (!urlSegura(l.portal)) o.disabled = true;
      g.append(o);
    }
    sel.append(g);
  }
  $('#entrar').disabled = true;
}

$('#localidad').addEventListener('change', (e) => {
  $('#entrar').disabled = !urlSegura(localidades[e.target.value]?.portal);
});

$('#entrar').addEventListener('click', () => {
  const l = localidades[$('#localidad').value];
  const href = l && urlSegura(l.portal);
  if (!href) return;
  guardar(l.nombre + '|' + l.provincia);
  location.href = href;
});

function pintarRecordada() {
  const clave = leer();
  const loc = localidades.find((l) => l.nombre + '|' + l.provincia === clave);
  const href = loc && urlSegura(loc.portal);
  $('#recordada').hidden = !href;
  $('#selector').hidden = !!href;
  if (href) {
    $('#recordada-nombre').textContent = String(loc.provincia).startsWith('PENDIENTE') ? loc.nombre : loc.nombre + ' (' + loc.provincia + ')';
    $('#recordada-btn').setAttribute('href', href);
  }
}

$('#cambiar').addEventListener('click', () => {
  borrar();
  pintarRecordada();
  $('#localidad').focus();
});

async function iniciar() {
  try {
    const r = await fetch('config.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('config ' + r.status);
    const cfg = await r.json();
    localidades = (Array.isArray(cfg.localidades) ? cfg.localidades : [])
      .filter((l) => l && typeof l.nombre === 'string')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  } catch {
    $('#vacio').hidden = false;
    $('#vacio').textContent = 'No pudimos cargar las localidades. Revisá tu conexión.';
  }
  pintarDesplegable();
  pintarRecordada();
}
iniciar();

// ---------- Instalación ----------
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
let eventoInstalar = null;

if (!instalada) {
  if (esIOS) {
    $('#instalar').hidden = false;
    $('#instalar-texto').textContent =
      'En Safari tocá el botón Compartir (cuadrado con flecha) y elegí “Agregar a pantalla de inicio”.';
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalar = e;
    $('#instalar').hidden = false;
    $('#instalar-texto').textContent = 'Agregala a tu teléfono para abrirla como cualquier app.';
    $('#btn-instalar').hidden = false;
  });
  $('#btn-instalar').addEventListener('click', async () => {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    eventoInstalar = null;
    $('#instalar').hidden = true;
  });
}

// ---------- Service worker (abre sin conexión) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
