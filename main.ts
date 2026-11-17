// main.ts — EMBERFALL's entrypoint (Node 22, standard library only).
//
// The game itself is plain static files under game/ (index.html plus ES
// modules, no library, no network request). This program hands it in: it
// copies game/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there, the summary the judge reads,
// built by the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally for play-testing with any static server, e.g.
//   python3 -m http.server 8080 --directory game
// and open http://localhost:8080 in a desktop browser.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps for this competition: the dossier text budget, at
// most four screenshots of at most 256 KiB each, and game/ at most 993
// files and directories totalling 48 MiB, no path over 1000 bytes.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, dossierCaps));
