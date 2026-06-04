import fs from 'fs';

async function listDir() {
  const url = `https://api.github.com/repos/FujitsuResearch/OneCompression/contents/onecomp`;
  const res = await fetch(url);
  const json = await res.json();
  console.log('onecomp:', json.map(x=>x.name));
  
  const url2 = `https://api.github.com/repos/FujitsuResearch/OneCompression/contents/onecomp/quantizer`;
  const res2 = await fetch(url2);
  const json2 = await res2.json();
  console.log('quantizer:', json2.map(x=>x.name));
}
listDir();