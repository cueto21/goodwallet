const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, '..', 'public', 'logo.png');
const outDir = path.join(__dirname, '..', 'public', 'icons');
const sizes = [48, 72, 96, 128, 192, 256, 512];

async function run() {
  if (!fs.existsSync(input)) {
    console.error('Input logo not found:', input);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const image = await Jimp.read(input);
  for (const s of sizes) {
    const outPath = path.join(outDir, `icon-${s}.png`);
    const cloned = image.clone();
    cloned.cover(s, s);
    await cloned.writeAsync(outPath);
    console.log('Wrote', outPath);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
