// Onglet Explorer : la vitrine par familles de gènes, maladies rares (classifications Orphanet) et cancers par organe.
import { esc, nf, LOADING, unavailable, begin, stale, pageHead, links, shareButton, section, loadOptional, symptomsBlock, lookChoice } from './views.js';
import { symptoms, hpoFr, orphaToMondo } from './api.js';
import { FAMILIES, CLASS_ICONS, CLASS_SHORT, ORGANS, labelBox, icon } from './explore-data.js';
import { HELP } from './texts.js';
import { t, tn, plural, isEn, locale } from './i18n.js';

// Les données fixes sont servies avec l'appli (préparées par tools/build_data.mjs).
const files = new Map();
function data(path) {
  if (!files.has(path)) {
    const p = fetch(`./data/${path}`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    p.catch(() => files.delete(path));
    files.set(path, p);
  }
  return files.get(path);
}

const backBar = (title, kicker) => `<div class="page-head">
    <button class="back" aria-label="${t('Retour')}" data-back>‹</button>
    <div class="titles"><p class="kicker">${esc(kicker)}</p><h1>${esc(title)}</h1></div>
    ${shareButton(title)}
  </div>`;

const tile = (href, tone, ic, title, sub) => `<a class="tile ${tone}" href="${href}">
    <span class="tile-ic">${icon(ic)}</span><strong>${esc(title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</a>`;

// ---------- Vitrine ----------

export async function renderExplore(app) {
  const my = begin();
  app.innerHTML = `<div class="page">
    <h1 class="page-title">${t('Explorer')}</h1>
    <div class="jump">
      <button class="teal" data-jump="s-fam">${t('Gènes')}</button><button class="violet" data-jump="s-rare">${t('Maladies rares')}</button><button class="coral" data-jump="s-can">${t('Cancers')}</button>
    </div>
    <h2 class="shelf" id="s-fam">${t('Familles de gènes')}</h2>
    <div class="mosaic" id="x-fam">${FAMILIES.map((f) => tile(`#/famille/${f.id}`, 'teal', f.icon, t(f.fr), '')).join('')}</div>
    <h2 class="shelf" id="s-rare">${t('Maladies rares')} <small>${t('classifications Orphanet')}</small></h2>
    <div class="mosaic" id="x-rare">${LOADING}</div>
    <h2 class="shelf" id="s-can">${t('Cancers')} <small>${t('par zone du corps')}</small></h2>
    <a class="body-card" href="#/cancers">
      ${bodySvg(null, true)}
      <span><strong>${t('Touchez une zone du corps')}</strong><small>${t('{n} zones, des tumeurs du cerveau aux leucémies', { n: ORGANS.length })}</small></span>
    </a>
    <div class="look-row"><span class="muted small">${t('Tuiles')}</span>${lookChoice()}</div>
  </div>`;

  app.querySelectorAll('[data-jump]').forEach((btn) => btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.jump)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }));

  data('familles/index.json').then((idx) => {
    if (stale(my)) return;
    const count = new Map(idx.map((f) => [f.id, f.count]));
    document.getElementById('x-fam').innerHTML = FAMILIES.map((f) => tile(`#/famille/${f.id}`, 'teal', f.icon, t(f.fr), tn(count.get(f.id) || 0, '{n} gène', '{n} gènes', { n: nf.format(count.get(f.id) || 0) }))).join('');
  }).catch(() => {});

  try {
    const idx = await data('orpha/index.json');
    if (stale(my)) return;
    const shown = idx.filter((c) => c.count >= 20);
    document.getElementById('x-rare').innerHTML = shown.slice(0, 11).map((c) => tile(`#/rares/${c.id}`, 'violet', CLASS_ICONS[c.id] || 'dot', label(c), tn(c.count, '{n} entrée', '{n} entrées', { n: nf.format(c.count) }))).join('')
      + tile('#/rares', 'violet', 'grid', t('Toutes les classifications'), tn(shown.length, '{n} classification', '{n} classifications'));
  } catch {
    if (!stale(my)) document.getElementById('x-rare').innerHTML = unavailable(t('Les données Orphanet'));
  }
}

const label = (c) => (CLASS_SHORT[c.id] ? t(CLASS_SHORT[c.id]) : c.name);
// Nom d'une sous-famille HGNC : traduction française préparée par build_data, sinon le nom officiel anglais.
const famName = (n) => (isEn() ? n.name : n.fr || n.name);

// ---------- Familles de gènes ----------

function findFamily(node, id) {
  if (node.id === id) return [node];
  for (const c of node.children) {
    const path = findFamily(c, id);
    if (path) return [node, ...path];
  }
  return null;
}

const GENE_PAGE = 120;

export async function renderFamily(app, arg) {
  const my = begin();
  const [rootId, subId] = arg.split('/').map(Number);
  const meta = FAMILIES.find((f) => f.id === rootId);
  if (!meta) { app.innerHTML = `<div class="page"><p class="muted">${t('Famille inconnue.')}</p></div>`; return; }
  app.innerHTML = LOADING;
  let tree;
  try {
    tree = await data(`familles/f${rootId}.json`);
  } catch {
    if (!stale(my)) app.innerHTML = `<div class="page">${unavailable(t('Les données HGNC'))}</div>`;
    return;
  }
  if (stale(my)) return;
  const path = findFamily(tree, subId || rootId) || [tree];
  const node = path.at(-1);
  const isRoot = path.length === 1;
  const crumbs = path.slice(0, -1).map((n, i) => `<a href="#/famille/${rootId}${i ? `/${n.id}` : ''}">${esc(i ? famName(n) : t(meta.fr))}</a>`).join(' › ');
  const genes = node.genes;
  const counted = node.children.length
    ? `${tn(node.count, '{n} gène', '{n} gènes', { n: nf.format(node.count) })} ${tn(node.children.length, 'dans {n} sous-famille', 'dans {n} sous-familles')}`
    : tn(node.count, '{n} gène', '{n} gènes', { n: nf.format(node.count) });
  app.innerHTML = `<div class="page">
    ${backBar(isRoot ? t(meta.fr) : famName(node), isRoot ? t('Famille de gènes') : t('Sous-famille'))}
    ${crumbs ? `<nav class="crumbs" aria-label="${t("Fil d'Ariane")}">${crumbs}</nav>` : ''}
    ${isRoot ? `<section class="card"><p class="prose">${esc(t(meta.text))}</p><p class="muted small">${t('Nom HGNC :')} ${esc(tree.name)}</p></section>` : ''}
    ${!isRoot && !isEn() && node.fr ? `<p class="muted small">${t('Nom HGNC :')} ${esc(node.name)}</p>` : ''}
    <p class="muted">${counted}</p>
    ${node.children.length ? `<section class="card"><h2>${t('Sous-familles')}</h2><ul class="tree">${node.children.map((c) => `<li><a href="#/famille/${rootId}/${c.id}"><span>${esc(famName(c))}</span><span class="num">${nf.format(c.count)} ›</span></a></li>`).join('')}</ul></section>` : ''}
    ${genes.length ? `<section class="card"><h2>${node.children.length ? t('Gènes classés directement ici') : t('Gènes')}</h2>
      <div class="gene-chips" id="f-genes">${geneChips(genes.slice(0, GENE_PAGE))}</div>
      ${genes.length > GENE_PAGE ? `<button class="more-btn" id="f-more">${tn(genes.length - GENE_PAGE, 'Voir l\'autre', 'Voir les {n} autres', { n: nf.format(genes.length - GENE_PAGE) })}</button>` : ''}
      <p class="source">${t('Source :')} HGNC (HUGO Gene Nomenclature Committee)</p></section>` : ''}
  </div>`;
  document.getElementById('f-more')?.addEventListener('click', (e) => {
    document.getElementById('f-genes').innerHTML = geneChips(genes);
    e.target.remove();
  });
}

const geneChips = (genes) => genes.map(([sym, name]) => `<a class="gchip" href="#/gene/${encodeURIComponent(sym)}" title="${esc(name)}">${esc(sym)}</a>`).join('');

// ---------- Maladies rares ----------

export async function renderRares(app, arg) {
  const my = begin();
  const [cid, code] = arg.split('/').map(Number);
  app.innerHTML = LOADING;
  let idx, fiches;
  try {
    [idx, fiches] = await Promise.all([data('orpha/index.json'), data('orpha/fiches.json')]);
  } catch {
    if (!stale(my)) app.innerHTML = `<div class="page">${unavailable(t('Les données Orphanet'))}</div>`;
    return;
  }
  if (stale(my)) return;
  const name = (c) => orphaName(fiches[c]) || `ORPHA:${c}`;

  if (!cid) {
    const shown = idx.filter((c) => c.count >= 20);
    app.innerHTML = `<div class="page">${backBar(t('Maladies rares'), t('Classifications Orphanet'))}
      <p class="muted">${t('Orphanet répartit les maladies rares dans {n} classifications, une par spécialité médicale. Une même maladie peut figurer dans plusieurs.', { n: shown.length })}</p>
      <div class="mosaic">${shown.map((c) => tile(`#/rares/${c.id}`, 'violet', CLASS_ICONS[c.id] || 'dot', label(c), tn(c.count, '{n} entrée', '{n} entrées', { n: nf.format(c.count) }))).join('')}</div>
      <p class="source">${t('Source :')} ${t('Orphanet (Inserm), licence CC BY 4.0')}</p></div>`;
    return;
  }

  const meta = idx.find((c) => c.id === cid);
  const unknown = () => { app.innerHTML = `<div class="page"><p class="muted">${t('Classification inconnue.')}</p><a href="#/rares">${t('Toutes les classifications')}</a></div>`; };
  // Un numéro absent de l'index n'a pas de fichier : inutile de le demander.
  if (!meta) return unknown();
  let roots;
  try {
    roots = await data(`orpha/c${cid}.json`);
  } catch {
    if (!stale(my)) app.innerHTML = `<div class="page">${unavailable(t('Les données Orphanet'))}</div>`;
    return;
  }
  if (stale(my)) return;
  if (!roots?.length) return unknown();
  const path = findOrpha(roots, code || roots[0][0]) || [roots[0]];
  const node = path.at(-1);
  // Les groupes d'abord, puis les maladies, chacun par ordre alphabétique.
  const kids = [...(node[1] || [])].sort((a, b) => (b[1] ? 1 : 0) - (a[1] ? 1 : 0) || name(a[0]).localeCompare(name(b[0]), locale()));
  const crumbs = path.slice(0, -1).map((n) => `<a href="#/rares/${cid}/${n[0]}">${esc(name(n[0]))}</a>`).join(' › ');
  const f = fiches[node[0]];
  app.innerHTML = `<div class="page">
    ${backBar(name(node[0]), label(meta))}
    ${crumbs ? `<nav class="crumbs" aria-label="${t("Fil d'Ariane")}">${crumbs}</nav>` : ''}
    ${f && f[1] !== 'Catégorie' ? `<a class="open-fiche" href="#/orpha/${node[0]}">${t('Ouvrir la fiche de cette maladie')} ›</a>` : ''}
    <section class="card"><h2>${kids.length ? tn(kids.length, '{n} sous-groupe ou maladie', '{n} sous-groupes et maladies', { n: nf.format(kids.length) }) : t('Aucun sous-groupe')}</h2>
      <ul class="tree">${kids.map((k) => orphaRow(cid, k, fiches)).join('')}</ul>
      <p class="source">${t('Source :')} ${t('Orphanet (Inserm), licence CC BY 4.0')}</p>
    </section>
  </div>`;
}

function orphaRow(cid, k, fiches) {
  const f = fiches[k[0]];
  const n = k[1]?.length || 0;
  const href = n ? `#/rares/${cid}/${k[0]}` : `#/orpha/${k[0]}`;
  const kind = f?.[1] === 'Catégorie' ? 'Groupe' : f?.[1] || '';
  const genes = f?.[3]?.length || 0;
  return `<li><a href="${href}"><span><span>${esc(orphaName(f) || `ORPHA:${k[0]}`)}</span>${kind ? `<small>${esc(t(kind))}${genes ? ` · ${genes} ${plural(genes, 'gène', 'gènes')}` : ''}</small>` : ''}</span><span class="num">${n ? `${nf.format(n)} ›` : '›'}</span></a></li>`;
}

// Nom d'une maladie Orphanet : français (indice 0) ou anglais (indice 4) selon la langue.
const orphaName = (f) => (f ? (isEn() && f[4]) || f[0] : '');

function findOrpha(nodes, code) {
  for (const n of nodes) {
    if (n[0] === code) return [n];
    const p = n[1] && findOrpha(n[1], code);
    if (p) return [n, ...p];
  }
  return null;
}

export async function renderOrpha(app, arg) {
  const my = begin();
  const code = Number(arg);
  app.innerHTML = LOADING;
  let fiches;
  try {
    fiches = await data('orpha/fiches.json');
  } catch {
    if (!stale(my)) app.innerHTML = `<div class="page">${unavailable(t('Les données Orphanet'))}</div>`;
    return;
  }
  if (stale(my)) return;
  const f = fiches[code];
  if (!f) { app.innerHTML = `<div class="page"><p class="muted">${t('ORPHA:{code} introuvable.', { code })}</p></div>`; return; }
  const [, type, omim, genes] = f;
  const name = orphaName(f);
  const causal = genes.filter((g) => g[1]);
  const other = genes.filter((g) => !g[1]);
  const chips = (list) => list.map(([s]) => `<a class="gchip" href="#/gene/${encodeURIComponent(s)}">${esc(s)}</a>`).join('');
  app.innerHTML = `<div class="page">
    ${pageHead({ kind: 'orpha', id: String(code), label: `${t('Maladie rare')} · ${t(type)}`, title: name, subtitle: `ORPHA:${code}` })}
    <section class="card">
      <header class="card-head"><h2>${t('Gènes en cause')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="orpha">?</button></header>
      <p class="help" id="help-orpha" hidden>${esc(t(HELP.orphaGenes))}</p>
      ${causal.length ? `<div class="gene-chips">${chips(causal)}</div>` : `<p class="muted">${t('Orphanet ne recense pas de gène dont les mutations causent cette maladie.')}</p>`}
      ${other.length ? `<h3>${t('Autres gènes liés')}</h3><p class="muted small">${t('Gènes qui modifient la maladie, y prédisposent ou sont étudiés.')}</p><div class="gene-chips">${chips(other)}</div>` : ''}
      <p class="source">${t('Source :')} ${t('Orphanet (Inserm), licence CC BY 4.0')}</p>
    </section>
    ${section('o-sym', 'Symptômes', HELP.symptoms, 'Human Phenotype Ontology (JAX) et Orphanet')}
    <section class="card" id="o-ot" hidden></section>
    <section class="card"><header class="card-head"><h2>${t('Aller plus loin')}</h2></header>
      ${links([
        [isEn() ? 'Orphanet' : 'Fiche Orphanet (en français)', `https://www.orpha.net/${isEn() ? 'en' : 'fr'}/disease/detail/${encodeURIComponent(code)}`],
        ['OMIM', omim && `https://omim.org/entry/${encodeURIComponent(omim)}`],
      ])}
    </section>
  </div>`;
  loadOptional('o-sym', Promise.all([symptoms({ orphanet: code, omim }), isEn() ? null : hpoFr().catch(() => null)]),
    ([s, frLabels]) => symptomsBlock(s, frLabels), my);
  orphaToMondo(code).then((mondo) => {
    const el = document.getElementById('o-ot');
    if (!mondo || !el || stale(my)) return;
    el.hidden = false;
    el.innerHTML = `<h2>${t('Analyse des gènes')}</h2><p class="prose">${t('Open Targets classe tous les gènes liés à cette maladie selon la force des preuves.')}</p><a class="open-fiche" href="#/maladie/${encodeURIComponent(mondo)}">${t('Voir l\'analyse Open Targets')} ›</a>`;
  }).catch(() => {});
}

// ---------- Cancers par zone du corps ----------

const ZONE = (o) => `<circle class="hit" cx="${o.x}" cy="${o.y}" r="13"/><circle class="halo" cx="${o.x}" cy="${o.y}" r="10"/><circle class="spot" cx="${o.x}" cy="${o.y}" r="5.5"/>`;

// Moitié gauche du corps, de la nuque à l'entrejambe ; la droite en est le reflet (piste C « Repères »
// avec volume, choisie le 2026-11-14). Le tracé part et finit 1 unité après l'axe pour que les deux
// moitiés se recouvrent sans fente.
const HALF = 'M101 58 L93 58 C93 63 92 67 92 71 C88 76 74 78 64 82 C54 86 48 94 47 106 C46 124 44 144 42 162 '
  + 'C40 186 38 206 36 226 C33 234 31 246 33 256 C35 263 41 263 42 256 C43 248 42 238 42 228 C44 208 47 188 49 168 '
  + 'C51 148 54 130 57 118 C60 132 62 148 63 162 C64 176 64 188 62 200 C59 214 56 228 56 244 C56 264 58 284 61 304 '
  + 'C63 322 65 336 66 346 C69 362 70 380 71 398 C71 408 72 414 72 420 C66 424 63 430 68 433 L90 433 '
  + 'C89 426 88 420 88 414 C88 396 89 378 90 362 C90 346 91 334 92 320 C93 300 96 280 98 270 L101 268';
const HEAD = '<ellipse cx="100" cy="35" rx="18" ry="23"/>';

// Contours discrets des organes, pour situer les points : trachée, poumons, foie, estomac, pancréas,
// gros intestin, reins (en pointillés : ils sont en arrière) et vessie.
const ORGAN_LINES = `<path d="M100 74 V96 M100 96 C96 99 92 101 89 104 M100 96 C104 99 108 101 111 104"/>
  <path d="M95 100 C86 99 75 108 70 124 C66 140 67 151 76 152 C86 153 94 146 95 134 Z"/>
  <path d="M105 100 C114 99 125 108 130 124 C134 140 133 151 124 152 C118 152 112 148 110 142 C108 136 106 130 105 124 Z"/>
  <path d="M64 162 C72 155 92 154 106 158 C104 169 92 177 77 179 C68 179 64 172 64 162 Z"/>
  <path d="M108 150 C118 145 130 151 129 164 C128 176 116 181 108 175 C104 171 104 163 108 160"/>
  <path d="M86 189 C96 185 110 185 118 189"/>
  <path d="M76 236 V206 C76 201 79 199 84 199 H116 C121 199 124 201 124 206 V232 C124 240 118 244 110 244"/>
  <g stroke-dasharray="3 3"><path d="M118 205 C112 207 112 225 118 228 C125 230 128 207 122 205 Z"/><path d="M82 205 C88 207 88 225 82 228 C75 230 72 207 78 205 Z"/></g>
  <ellipse cx="100" cy="247" rx="9" ry="7"/>`;

// Volume : dégradé, ombre intérieure sur les bords, reflet en haut à gauche et ombre portée. Les couleurs
// viennent des variables --body-* (thème clair ou sombre).
const bodyDefs = (k) => `<defs>
    <linearGradient id="bf-${k}" gradientUnits="userSpaceOnUse" x1="40" y1="20" x2="170" y2="430"><stop offset="0" class="bf1"/><stop offset="1" class="bf2"/></linearGradient>
    <filter id="bv-${k}" x="-20%" y="-10%" width="140%" height="120%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>
      <feComposite in="SourceAlpha" in2="b" operator="out" result="edge"/>
      <feFlood class="bshade"/><feComposite in2="edge" operator="in" result="shade"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="b2"/><feOffset in="b2" dx="2.5" dy="2.5" result="b2o"/>
      <feComposite in="SourceAlpha" in2="b2o" operator="out" result="hl0"/>
      <feFlood class="bhl"/><feComposite in2="hl0" operator="in" result="hl"/>
      <feDropShadow class="bdrop" in="SourceGraphic" dx="0" dy="5" stdDeviation="6" result="ds"/>
      <feMerge><feMergeNode in="ds"/><feMergeNode in="shade"/><feMergeNode in="hl"/></feMerge>
    </filter>
  </defs>`;

function zoneLabel(o) {
  const b = labelBox(o, t(o.short || o.fr));
  if (!b) return '';
  return `<g class="zlabel"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="10"/>
    <text x="${b.x + b.w / 2}" y="${b.y + 14}" text-anchor="middle">${esc(b.text)}</text></g>`;
}

function bodySvg(active, mini = false) {
  const on = ORGANS.find((o) => o.id === active);
  const k = mini ? 'm' : 'f';
  const shape = `<path d="${HALF}"/><path d="${HALF}" transform="translate(200 0) scale(-1 1)"/>${HEAD}`;
  return `<svg class="body ${mini ? 'mini' : ''}" viewBox="${mini ? "0 0 200 440" : "-40 0 280 440"}" role="img" aria-label="${t('Silhouette humaine')}">
    ${bodyDefs(k)}
    <g class="fill" fill="url(#bf-${k})" filter="url(#bv-${k})">${shape}</g>
    <g class="outline">${shape}</g>
    ${mini ? '' : `<g class="organs">${ORGAN_LINES}</g>`}
    ${on && !mini ? zoneLabel(on) : ''}
    ${ORGANS.map((o) => (mini
    ? `<g class="zone">${ZONE(o)}</g>`
    : `<a href="#/cancers/${o.id}" class="zone ${o === on ? 'on' : ''}" aria-label="${esc(t(o.fr))}">${ZONE(o)}</a>`)).join('')}
  </svg>`;
}

export function renderCancers(app, organ) {
  begin();
  const o = ORGANS.find((x) => x.id === organ);
  app.innerHTML = `<div class="page">
    ${backBar(o ? t(o.fr) : t('Cancers'), o ? t('Cancers · zone du corps') : t('Par zone du corps'))}
    <div class="body-wrap">${bodySvg(o?.id)}</div>
    ${o ? `<section class="card"><h2>${t('Cancers de cette zone')}</h2>
        <ul class="tree">${o.cancers.map(([id, fr]) => `<li><a href="#/maladie/${id}"><span>${esc(t(fr))}</span><span class="num">›</span></a></li>`).join('')}</ul>
        <p class="source">${t('Gènes et description : Open Targets Platform')}</p></section>` : `<p class="muted center">${t('Touchez un point sur la silhouette, ou choisissez une zone ci-dessous.')}</p>`}
    <div class="organ-chips">${ORGANS.map((x) => `<a class="ochip ${x.id === o?.id ? 'on' : ''}" href="#/cancers/${x.id}">${esc(t(x.fr))}</a>`).join('')}</div>
  </div>`;
}

