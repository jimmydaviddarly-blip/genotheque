// Après `npm run data` : liste les fichiers de public/data qui ont VRAIMENT changé, en ignorant les dates
// (elles changent à chaque régénération, même quand les bases n'ont pas bougé). Sert à la mise à jour
// mensuelle : pas de demande de fusion s'il n'y a rien de nouveau.
// Usage : node tools/data_diff.mjs        (affiche les fichiers changés, code 0 dans tous les cas)
//         node tools/data_diff.mjs --restore   (remet les fichiers ne différant que par une date)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sansDates = (v) => {
  if (Array.isArray(v)) return v.map(sansDates);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'date' && k !== 'versions').map(([k, x]) => [k, sansDates(x)]));
  }
  return v;
};

const restore = process.argv.includes('--restore');
const modifies = git('ls-files', '-m', 'public/data').split('\n').filter(Boolean);
const nouveaux = git('ls-files', '-o', '--exclude-standard', 'public/data').split('\n').filter(Boolean);
const reels = [...nouveaux];

for (const f of modifies) {
  if (!f.endsWith('.json')) { reels.push(f); continue; }
  const avant = sansDates(JSON.parse(git('show', `HEAD:${f}`)));
  const apres = sansDates(JSON.parse(readFileSync(f, 'utf8')));
  if (JSON.stringify(avant) !== JSON.stringify(apres)) reels.push(f);
  else if (restore) writeFileSync(f, git('show', `HEAD:${f}`));
}
if (reels.length) console.log(reels.join('\n'));
