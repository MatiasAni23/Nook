import { existsSync } from 'node:fs';
import { mkdir, copyFile, writeFile, readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

// Build only a debug APK. Release signing keys never belong in this repository.
const env = { ...process.env };
// Gradle's wrapper treats a generic DEBUG variable as a request to echo commands.
delete env.DEBUG;
// A local portable JDK can be used without modifying the system's Java install.
const toolchains = resolve('docs-local/mobile/toolchains');
if (!env.JAVA_HOME && existsSync(toolchains)) {
  const jdk = (await readdir(toolchains)).find(name => name.startsWith('jdk-21') && existsSync(join(toolchains, name, 'bin', 'java.exe')));
  if (jdk) env.JAVA_HOME = join(toolchains, jdk);
}
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT ||
  (process.platform === 'win32' && env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Android', 'Sdk') : '');
if (sdk && existsSync(sdk)) env.ANDROID_HOME = sdk;
if (!env.ANDROID_HOME) throw new Error('Configura ANDROID_HOME con la ruta del SDK de Android.');
const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const result = spawnSync(wrapper, ['assembleDebug', '--no-daemon'], {
  cwd: resolve('android'), env, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const folder = resolve('docs-local/mobile/apk');
await mkdir(folder, { recursive: true });
const version = (await readFile('android/app/build.gradle', 'utf8')).match(/versionName\s+"([\d.]+)"/)?.[1];
if (!version) throw new Error('No se pudo leer la versión Android.');
const apkName = `Pinwi-${version}-debug.apk`;
const apk = join(folder, apkName);
await copyFile(resolve('android/app/build/outputs/apk/debug/app-debug.apk'), apk);
const sha = createHash('sha256').update(await readFile(apk)).digest('hex');
await writeFile(`${apk}.sha256`, `${sha}  ${apkName}\n`);
console.log(`\nAPK de prueba: ${apk}`);
