import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const source = process.argv[2];
if (!source) throw new Error('Pass the path to a checkout of DuarteSantos8/openGym.');
const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
const dir = join(source, 'catalogue', 'exercises');
const ar = JSON.parse(await readFile(join(source,'catalogue','i18n','ar.json'), 'utf8'));
const records = await Promise.all((await readdir(dir)).filter(file => /^\d+\.json$/.test(file)).sort().map(async file => {
  return JSON.parse(await readFile(join(dir,file),'utf8'));
 }));
const byId = new Map(records.map(item => [item.id,item]));
const data = records.map(record => {
  let item = record;
  const seen = new Set([record.id]);
  while (!item.name && item.variantOf && byId.has(item.variantOf) && !seen.has(item.variantOf)) {
    seen.add(item.variantOf);
    item = byId.get(item.variantOf);
  }
  const localized = {...ar[item.id], ...ar[record.id]};
  const arabicSteps = Array.isArray(localized.instructions) && localized.instructions.length > 0;
  return {
    id: 'og-' + record.id,
    name: localized.name || item.name,
    englishName: item.name,
    description: localized.description || item.description || '',
    descriptionLanguage: localized.description ? 'ar' : 'en',
    instructionLanguage: arabicSteps ? 'ar' : 'en',
    equipment: item.equipment,
    target: item.target,
    secondaryMuscles: item.secondaryMuscles,
    category: item.category,
    instructions: arabicSteps ? localized.instructions : item.instructions,
    ...(record.variantOf ? {variantOf:'og-' + record.variantOf} : {}),
  };
});
const ids = new Set(data.map(item => item.id));
if (ids.size !== data.length || data.some(item => !item.name || !item.target || !Array.isArray(item.instructions)
  || (item.variantOf && !ids.has(item.variantOf)))) throw new Error('Invalid upstream exercise catalogue.');
const out = 'src/opengym';
await mkdir(out,{recursive:true});
await writeFile(join(out,'catalogue.json'),'[\n' + data.map(item=>JSON.stringify(item)).join(',\n') + '\n]\n');
const geometrySource = execFileSync('git',['-C',source,'show','HEAD:frontend/src/lib/body-paths.js'],{encoding:'utf8'});
const geometry = JSON.parse(geometrySource.split('export default ')[1].trim().replace(/;$/, ''));
await writeFile(join(out,'body-paths.json'),JSON.stringify(geometry));
await copyFile(join(source,'LICENSE'),join(out,'LICENSE-AGPL-3.0.txt'));
await copyFile(join(source,'NOTICE.md'),join(out,'NOTICE-upstream.md'));
await writeFile(join(out,'SOURCE.md'), [
  '# openGym exercise catalogue',
  '',
  'Upstream: https://github.com/DuarteSantos8/openGym/tree/' + commit + '/catalogue',
  '',
  'Copyright (C) 2026 Duarte Santos and contributors. See LICENSE-AGPL-3.0.txt and NOTICE-upstream.md for the upstream licensing and the MIT attribution for ExerciseDB-derived fields.',
  '',
  'Adapted for HEALTH CARE by selecting Arabic translations when available, adding a local ID prefix, and retaining the original exercise categories and identifiers. Exercise stills and animations are excluded.',
  '',
  'Body geometry is imported from frontend/src/lib/body-paths.js, derived from MuscleMap by Melih Colpan under the MIT licence reproduced in NOTICE-upstream.md. It is rendered locally in the HEALTH CARE orange palette.',
  '',
  'A future distribution must comply with the licence for the catalogue and any resulting combined work. The current integration is a local review.',
  '',
].join('\n'));
console.log(`${data.length} exercises; ${data.filter(item => item.instructionLanguage==='ar').length} with Arabic steps; commit ${commit}`);
