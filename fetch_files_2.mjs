import fs from 'fs';
import path from 'path';

const files = [
  'onecomp/quantizer/autobit/__init__.py',
  'onecomp/quantizer/autobit/autobit.py',
  'onecomp/qep/__init__.py',
  'onecomp/qep/qep.py'
];

async function download() {
  for (const file of files) {
    const url = `https://raw.githubusercontent.com/FujitsuResearch/OneCompression/main/${file}`;
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const targetName = file.replace(/\//g, '_');
      fs.writeFileSync(path.join(process.cwd(), targetName), text);
      console.log(`Downloaded ${targetName}`);
    } else {
      console.error(`Failed ${file}: ${res.statusText}`);
    }
  }
}
download();