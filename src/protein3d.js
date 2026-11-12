// Visionneuse 3D de la protéine prédite par AlphaFold. La bibliothèque 3Dmol (environ 500 Ko)
// n'est chargée qu'au premier affichage, à la demande, pour ne pas alourdir l'appli.

// Couleurs officielles d'AlphaFold selon la confiance du modèle (pLDDT, stocké à la place du facteur B).
const CONFIDENCE = [[90, '#0053d6'], [70, '#65cbf3'], [50, '#ffdb13'], [0, '#ff7d45']];
const colorOf = (atom) => CONFIDENCE.find(([min]) => atom.b >= min)[1];

export async function showProtein(container, pdbUrl) {
  const [lib, pdb] = await Promise.all([
    import('3dmol'),
    fetch(pdbUrl).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    }),
  ]);
  // 3Dmol est publié en module CommonJS : ses fonctions arrivent sous « default ».
  const $3Dmol = lib.createViewer ? lib : lib.default;
  container.innerHTML = '';
  const viewer = $3Dmol.createViewer(container, { backgroundAlpha: 0, antialias: true });
  viewer.addModel(pdb, 'pdb');
  viewer.setStyle({}, { cartoon: { colorfunc: colorOf, thickness: 0.6 } });
  viewer.zoomTo();
  viewer.zoom(1.15);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!still) viewer.spin('y', 0.4);
  viewer.render();
  // Le doigt prend la main : la rotation automatique s'arrête.
  container.addEventListener('pointerdown', () => viewer.spin(false), { once: true });
  return viewer;
}
