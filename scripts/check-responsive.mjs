#!/usr/bin/env node
/**
 * Responsive smoke test: checks every page and dashboard tab for horizontal
 * overflow at mobile/tablet/desktop widths and saves full-page screenshots.
 *
 * Usage:
 *   npm run check:responsive
 *   CHROME_PATH=/path/to/chrome npm run check:responsive
 *   SHOTS_DIR=./shots BASE_URL=http://localhost:3000 MATCH_ID=20250603 npm run check:responsive
 *
 * Requires puppeteer-core (no bundled Chromium) and a local Chrome/Chromium.
 */
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const MATCH_ID = process.env.MATCH_ID ?? "20250603";
const SHOTS_DIR =
  process.env.SHOTS_DIR ?? join(tmpdir(), "humbol-responsive-shots");
const WIDTHS = [320, 375, 768, 1280];

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const ROUTES = [
  ["list", "/partidos"],
  ["dash", `/partidos/${MATCH_ID}`],
  ["roster", `/partidos/${MATCH_ID}/roster`],
  ["cancha", `/partidos/${MATCH_ID}/cancha`],
];

const TABS = ["Gráficos", "Mapas de calor", "Sprints"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findChrome() {
  const found = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `No se encontró Chrome. Definí CHROME_PATH. Buscado en:\n${CHROME_CANDIDATES.join("\n")}`,
    );
  }
  return found;
}

function overflowOf(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

await mkdir(SHOTS_DIR, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--hide-scrollbars"],
});

let failures = 0;

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

  for (const [name, route] of ROUTES) {
    await page.goto(BASE_URL + route, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector("h1", { timeout: 15000 });
    await sleep(700);
    const { scrollWidth, innerWidth } = await overflowOf(page);
    const overflow = scrollWidth - innerWidth;
    if (overflow > 0) failures++;
    console.log(
      `${String(width).padStart(4)}px ${name.padEnd(7)} overflow=${overflow}`,
    );
    await page.screenshot({
      path: join(SHOTS_DIR, `${name}-${width}.png`),
      fullPage: true,
    });
  }

  await page.goto(BASE_URL + `/partidos/${MATCH_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector('[data-slot="tabs-trigger"]', { timeout: 15000 });

  for (const tab of TABS) {
    const handles = await page.$$('[data-slot="tabs-trigger"]');
    const target = (
      await Promise.all(
        handles.map(async (handle) => ({
          handle,
          text: await handle.evaluate((el) => el.textContent.trim()),
        })),
      )
    ).find(({ text }) => text === tab);

    if (!target) {
      console.log(`${String(width).padStart(4)}px tab=${tab} NOT FOUND`);
      failures++;
      continue;
    }

    // Tabs may sit outside the visible scroll area at narrow widths.
    await target.handle.evaluate((el) => el.click());
    await sleep(500);
    const { scrollWidth, innerWidth } = await overflowOf(page);
    const overflow = scrollWidth - innerWidth;
    if (overflow > 0) failures++;
    console.log(
      `${String(width).padStart(4)}px tab=${tab.padEnd(14)} overflow=${overflow}`,
    );
    await page.screenshot({
      path: join(SHOTS_DIR, `dash-${tab.replace(/\s/g, "")}-${width}.png`),
      fullPage: true,
    });
  }

  await page.close();
}

await browser.close();

console.log(`\nCapturas: ${SHOTS_DIR}`);
console.log(
  failures === 0
    ? "OK: sin overflow horizontal"
    : `FAIL: ${failures} casos con overflow`,
);
process.exit(failures === 0 ? 0 : 1);
