import fs from 'fs';
import path from 'path';

const files = [
  'onecomp/runner.py',
  'onecomp/model_config.py',
  'onecomp/quantizer/autobit.py',
  'onecomp/quantizer/__init__.py',
  'onecomp/calibration.py'
];

async function download() {
  for (const file of files) {
    const url = `https://raw.githubusercontent.com/FujitsuResearch/OneCompression/main/${file}`;
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const target = path.join(process.cwd(), path.basename(file));
      fs.writeFileSync(target, text);
      console.log(`Downloaded ${file}`);
    } else {
      console.error(`Failed ${file}: ${res.statusText}`);
    }
  }
}
download();