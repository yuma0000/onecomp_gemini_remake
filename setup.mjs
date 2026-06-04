import https from 'https';
import fs from 'fs';
import { execSync } from 'child_process';

const url = 'https://codeload.github.com/FujitsuResearch/OneCompression/tar.gz/refs/heads/main';
https.get(url, (res) => {
  const file = fs.createWriteStream('main.tar.gz');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    execSync('tar -xzf main.tar.gz');
    console.log('Extracted');
  });
}).on('error', (err) => {
  console.error(err);
});
