// Clé de rapprochement entre le nom anglais d'un médicament (Open Targets : AZITHROMYCIN, IMATINIB MESYLATE)
// et son nom français dans la BDPM (AZITHROMYCINE, MÉSILATE D'IMATINIB) : sans accents ni sels,
// le mot le plus long, sans « E » final. Partagée par tools/build_data.mjs et l'appli.

const SALTS = new Set(('CHLORHYDRATE DICHLORHYDRATE BROMHYDRATE HYDROCHLORIDE SULFATE MESILATE MESYLATE MALEATE TARTRATE '
  + 'CITRATE PHOSPHATE ACETATE SODIUM SODIQUE POTASSIUM POTASSIQUE CALCIUM CALCIQUE MAGNESIUM MONOHYDRATE DIHYDRATE '
  + 'TRIHYDRATE HYDRATE ANHYDRE BASE FUMARATE SUCCINATE BESILATE TOSILATE LYSINE HYCLATE DIPROPIONATE PROPIONATE '
  + 'VALERATE BUTYRATE NITRATE BROMURE CHLORURE IODURE OXYDE HEMIHYDRATE SESQUIHYDRATE DE DU DES ALFA BETA '
  + 'TOSYLATE ESILATE ESYLATE EDISYLATE HYDROBROMIDE BROMIDE CHLORIDE OXALATE LACTATE GLUCONATE MALATE PAMOATE '
  + 'BITARTRATE ARGININE MEGLUMINE TROMETAMOL TERT BUTYLAMINE ERBUMINE').split(' '));
// « Dimaléate », « ditosylate », « trihydrate » : le préfixe multiplicateur ne change pas la nature du sel.
const isSalt = (w) => SALTS.has(w) || SALTS.has(w.replace(/^(DI|TRI|HEMI|BI)/, ''));

// Noms américains qui diffèrent du nom international employé en France.
const US_NAMES = { ACETAMINOPHEN: 'PARACETAMOL', EPINEPHRIN: 'ADRENALIN', NOREPINEPHRIN: 'NORADRENALIN', ALBUTEROL: 'SALBUTAMOL', GLYBURID: 'GLIBENCLAMID' };

export function drugKey(name) {
  const words = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z]+/)
    .filter((w) => w.length > 2 && !isSalt(w));
  const key = (words.sort((a, b) => b.length - a.length)[0] || '').replace(/E$/, '');
  return US_NAMES[key] || key;
}
