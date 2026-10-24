import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

// Reuse the original Pinwi pin, with enough clearance for circular/adaptive masks.
const source = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const mark = source.replace('<svg ', '<svg x="320" y="185" width="384" height="654" ');
const svg = (background, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? '<rect width="1024" height="1024" fill="white"/>' : ''}<g transform="translate(${512 * (1 - scale)} ${512 * (1 - scale)}) scale(${scale})">${mark}</g></svg>`;
async function png(path, size, background = true, scale = 1) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, new Resvg(svg(background, scale), { fitTo: { mode: 'width', value: size } }).render().asPng());
}
await png('public/brand/app-icon-192.png', 192);
await png('public/brand/app-icon-512.png', 512);
await png('public/apple-touch-icon.png', 180);
for (const [density, size, foreground] of [['mdpi',48,108],['hdpi',72,162],['xhdpi',96,216],['xxhdpi',144,324],['xxxhdpi',192,432]]) {
  const folder = `android/app/src/main/res/mipmap-${density}`;
  await png(`${folder}/ic_launcher.png`, size);
  await png(`${folder}/ic_launcher_round.png`, size);
  await png(`${folder}/ic_launcher_foreground.png`, foreground, false, 0.8);
}
await png('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);
for (const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']) {
  await png(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, 2732, true, 0.22);
}
for (const folder of await readdir('android/app/src/main/res')) {
  if (folder.startsWith('drawable') && (await readdir(`android/app/src/main/res/${folder}`)).includes('splash.png')) {
    await png(`android/app/src/main/res/${folder}/splash.png`, 1024, true, 0.3);
  }
}
console.log('Iconos de Pinwi generados para web, Android e iOS.');
