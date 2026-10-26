#!/usr/bin/env node
// snapshot-content.mjs — Ensambla seo/paginas/<slug>/contenido.md a partir del JSON del producto.
// Es un "snapshot" del texto que sale al HTML, para que kw_coverage.py y copy_lint.py puedan medir.
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerContenido } from '../lib/contenido.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function listProducts() {
  return leerContenido(join(root, 'content')).productos;
}

function fmtMd(p) {
  const lines = [];
  lines.push('---');
  lines.push(`title: "${p.seo.title}"`);
  lines.push(`description: "${p.seo.description}"`);
  lines.push(`slug: ${p.slug}`);
  lines.push('updatedAt: 2026-10-26');
  lines.push('---');
  lines.push('');
  lines.push(`# ${p.h1}`);
  lines.push('');
  lines.push(p.resumen);
  lines.push('');
  if (p.activos && p.activos.length) {
    lines.push('## Activos principales');
    lines.push('');
    for (const a of p.activos) {
      lines.push(`- **${a.nombre}**: ${a.queHace}`);
    }
    lines.push('');
  }
  lines.push('## Cómo se usa');
  lines.push('');
  lines.push(p.modoDeUso);
  lines.push('');
  if (p.beneficios && p.beneficios.length) {
    lines.push('## Beneficios');
    lines.push('');
    for (const b of p.beneficios) lines.push(`- ${b}`);
    lines.push('');
  }
  if (p.incluye && p.incluye.length) {
    lines.push('## Qué incluye');
    lines.push('');
    for (const i of p.incluye) lines.push(`- ${i}`);
    lines.push('');
  }
  lines.push('## Ingredientes');
  lines.push('');
  lines.push(p.ingredientes);
  if (p.tamano) {
    lines.push('');
    lines.push(`Tamaño: ${p.tamano}`);
  }
  lines.push('');
  if (p.faq && p.faq.length) {
    lines.push('## Preguntas frecuentes');
    lines.push('');
    for (const q of p.faq) {
      lines.push(`### ${q.q}`);
      lines.push('');
      lines.push(q.a);
      lines.push('');
    }
  }
  return lines.join('\n');
}

async function main() {
  const productos = await listProducts();
  for (const p of productos) {
    const path = join(root, 'seo', 'paginas', p.slug, 'contenido.md');
    await writeFile(path, fmtMd(p), 'utf8');
    console.log(`wrote ${path}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
