import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(resolve('supabase/functions/_shared/emailTemplates.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext('(function(exports, module){' + compiled + '\n})', { URL })(module.exports, module);
const { authEmailTemplates, renderEmail, renderBrevoDelegateTemplate, delegateEmailMetadata } = module.exports;
const directory = resolve('supabase/templates');
const previewDirectory = resolve('docs-local/email/previews');
mkdirSync(directory, { recursive: true });
mkdirSync(previewDirectory, { recursive: true });

const previews = {
  '{{ .Token }}': '12345678', '{{ .ConfirmationURL }}': 'https://www.pinwi.cl/iniciar-sesion',
  '{{ .NewEmail }}': 'nuevo@ejemplo.test', '{{ .OldEmail }}': 'anterior@ejemplo.test', '{{ .Email }}': 'cuenta@ejemplo.test',
  '{{ .OldPhone }}': '+56 9 0000 0000', '{{ .Phone }}': '+56 9 1111 1111', '{{ .Provider }}': 'Google', '{{ .FactorType }}': 'TOTP',
  '{{ params.name }}': 'Camila', '{{ params.invite_url }}': 'https://www.pinwi.cl/delegate-invite?token=ejemplo-sin-validez',
  '{{ params.expires_at_label }}': '20 de octubre de 2026, 18:00',
};
const manifest = [];
const patch = {};
for (const template of [...authEmailTemplates, delegateEmailMetadata]) {
  const html = template.key === delegateEmailMetadata.key ? renderBrevoDelegateTemplate() : renderEmail(template);
  writeFileSync(resolve(directory, template.key + '.html'), html, 'utf8');
  let preview = html;
  for (const [placeholder, sample] of Object.entries(previews)) preview = preview.replaceAll(placeholder, sample);
  writeFileSync(resolve(previewDirectory, template.key + '.html'), preview, 'utf8');
  manifest.push({ key: template.key, label: template.label, subject: template.subject, preheader: template.preheader, provider: template.key === delegateEmailMetadata.key ? 'Brevo' : 'Supabase Auth', notification: !!template.notification });
  if (template.key !== delegateEmailMetadata.key) {
    patch['mailer_subjects_' + template.key] = template.subject;
    patch['mailer_templates_' + template.key + '_content'] = html;
  }
}
writeFileSync(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
// A narrowly scoped payload: it never enables notifications or changes Auth/SMTP settings.
writeFileSync(resolve('docs-local/email/auth-templates-patch.json'), JSON.stringify(patch, null, 2) + '\n', 'utf8');
const rows = manifest.map(t => `<a class="item" href="previews/${t.key}.html"><strong>${t.label}</strong><span>${t.subject}</span><small>${t.provider}${t.notification ? ' · aviso opcional' : ''}</small></a>`).join('\n');
writeFileSync(resolve('docs-local/email/index.html'), `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Correos de Pinwi · Vista previa</title><style>body{margin:0;background:#f5f5fa;font-family:Arial,sans-serif;color:#202039}main{max-width:900px;margin:auto;padding:40px 20px}h1{color:#4f46e5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}.item{padding:24px;border:1px solid #e6e6f0;border-radius:16px;background:white;text-decoration:none;color:inherit}.item:hover,.item:focus-visible{border-color:#4f46e5}.item strong,.item span,.item small{display:block}.item span{font-size:14px;color:#616179;margin:12px 0;line-height:1.5}.item small{color:#6d5bd0}p{line-height:1.6}</style></head><body><main><h1>Los correos de Pinwi</h1><p>Vistas previas con datos ficticios. Abre una plantilla para ver el diseño. Los HTML para copiar están en <code>supabase/templates</code>.</p><div class="grid">${rows}</div></main></body></html>`, 'utf8');
console.log(`Generadas ${manifest.length} plantillas de Pinwi y sus vistas previas con datos ficticios.`);
