import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
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
const guide = (await readFile('assets/pinwi-guide-v1.png')).toString('base64');
const wordmark = (await readFile('assets/pinwi-wordmark.svg')).toString('base64');
const mascotSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><image href="data:image/png;base64,${guide}" width="1024" height="1024" /></svg>`;
const wordmarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="196"><filter id="white"><feFlood flood-color="white"/><feComposite in2="SourceGraphic" operator="in"/></filter><image href="data:image/svg+xml;base64,${wordmark}" width="512" height="196" filter="url(#white)" /></svg>`;
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732"><rect width="2732" height="2732" fill="#21183f"/><image href="data:image/png;base64,${guide}" x="866" y="650" width="1000" height="1000"/><image href="data:image/svg+xml;base64,${Buffer.from(wordmarkSvg).toString('base64')}" x="1106" y="1650" width="520" height="199"/></svg>`;
const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
await writeFile('public/brand/splash-mascot.png', render(mascotSvg, 512));
await mkdir('android/app/src/main/res/drawable-nodpi', { recursive: true });
await writeFile('android/app/src/main/res/drawable-nodpi/splash_mascot.png', render(mascotSvg.replace('width="1024" height="1024" />', 'x="92" y="92" width="840" height="840" />'), 512));
await writeFile('android/app/src/main/res/drawable-nodpi/splash_wordmark.png', render(wordmarkSvg, 320));
for (const name of ['splash-2732x2732.png','splash-2732x2732-1.png','splash-2732x2732-2.png']) {
  await writeFile(`ios/App/App/Assets.xcassets/Splash.imageset/${name}`, render(splashSvg, 2732));
}
for (const folder of await readdir('android/app/src/main/res')) {
  if (/^drawable-(?:port|land)-(?:mdpi|hdpi|xhdpi|xxhdpi|xxxhdpi)$/.test(folder) && (await readdir(`android/app/src/main/res/${folder}`)).includes('splash.png')) {
    // All legacy orientation variants were identical. Keep one centered asset.
    await unlink(`android/app/src/main/res/${folder}/splash.png`);
  }
}
await writeFile('android/app/src/main/res/drawable/splash.png', render(splashSvg, 1280));
console.log('Iconos de Pinwi generados para web, Android e iOS.');
