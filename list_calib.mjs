import fs from 'fs';

async function listDir() {
  const url = `https://api.github.com/repos/FujitsuResearch/OneCompression/contents/onecomp/calibration`;
  const res = await fetch(url);
  const json = await res.json();
  console.log('calibration:', json.map(x=>x.name));
}
listDir();