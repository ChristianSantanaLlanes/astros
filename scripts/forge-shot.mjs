import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const OUT = "/tmp/forge-captures";
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});

async function shot(page, name) {
  await new Promise((r) => setTimeout(r, 250));
  await page.screenshot({ path: `${OUT}/${name}.png`, type: "png" });
}

async function desktop() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForSelector(".row, .empty", { timeout: 10000 });
  await shot(page, "lista-desktop");
  await page.click(".row");
  await shot(page, "teclado-desktop");
  await page.click("#row-seed-1 .status-btn");
  await page.waitForSelector(".menu, .status-menu", { timeout: 2000 }).catch(() => undefined);
  await shot(page, "estados-desktop");
  await page.keyboard.press("Escape");

  await page.keyboard.press("c");
  await page.waitForSelector(".inline-capture-title, .inline-capture, .composer", { timeout: 5000 });
  const title = await page.$(".inline-capture-title");
  if (title) {
    await title.type("Handle GPS dropouts gracefully", { delay: 12 });
  }
  await shot(page, "captura-desktop");
  await page.keyboard.press("Escape");
  await page.waitForSelector(".inline-capture, .composer", { hidden: true, timeout: 5000 }).catch(() => undefined);

  await page.keyboard.down("Control");
  await page.keyboard.press("k");
  await page.keyboard.up("Control");
  await page.waitForSelector(".palette", { timeout: 5000 });
  await shot(page, "busqueda-desktop");
  await page.keyboard.press("Escape");

  await page.click(".row");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".detail-shell", { timeout: 5000 });
  await shot(page, "detalle-desktop");
  await page.keyboard.press("Escape");

  const row = await page.$(".row");
  if (row) {
    const box = await row.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 40, box.y + 10);
      await page.mouse.down();
      await page.mouse.move(box.x + 40, box.y + 140, { steps: 8 });
      await shot(page, "movimiento-desktop");
      await page.mouse.up();
    }
  }

  await page.keyboard.press("Escape");
  await page.keyboard.press("/");
  await page.waitForSelector(".palette-input, .palette", { timeout: 5000 });
  await page.keyboard.type("zzzz-no-match", { delay: 20 });
  await shot(page, "vacio-desktop");
  await page.close();
}

async function mobile() {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle0", timeout: 20000 });
  await page.waitForSelector(".row, .empty", { timeout: 10000 });
  await shot(page, "lista-mobile");
  await page.keyboard.press("c");
  await page.waitForSelector(".inline-capture, .composer", { timeout: 5000 }).catch(() => undefined);
  await shot(page, "captura-mobile");
  await page.close();
}

try {
  await desktop();
  await mobile();
} finally {
  await browser.close();
}
console.log("ok");
