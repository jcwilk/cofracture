import { chromium } from "playwright";

const PREVIEW_URL = "http://localhost:4173/cofracture/";
const SEQ_KEY = "cofracture-mesh-discovery-seq";

async function waitForApp(page) {
  await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas.fractal-canvas", { timeout: 60_000 });
  await page.waitForTimeout(12_000);
}

async function readSeq(context) {
  return context.cookies().then(async () => {
    const page = context.pages()[0] ?? (await context.newPage());
    return page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? Number.parseInt(raw, 10) : 0;
    }, SEQ_KEY);
  });
}

async function main() {
  const browser = await chromium.launch();
  const founder = await browser.newContext();
  const joiner = await browser.newContext();

  const founderPage = await founder.newPage();
  const joinerPage = await joiner.newPage();

  console.log("4.2: founder loads bare URL");
  await waitForApp(founderPage);

  const founderSeq = await readSeq(founder);
  console.log(`founder seq after first load: ${founderSeq}`);
  if (founderSeq < 1) {
    throw new Error("founder did not publish discovery advertisements");
  }

  console.log("4.2: joiner loads bare URL while founder is online");
  await waitForApp(joinerPage);
  await joinerPage.waitForTimeout(5_000);

  const joinerMesh = await joinerPage.evaluate(() => {
    return localStorage.getItem("cofracture-mesh-discovery-seq");
  });
  if (!joinerMesh) {
    throw new Error("joiner did not persist discovery seq");
  }

  console.log("4.2: reload founder preserves higher seq");
  const seqBeforeReload = await readSeq(founder);
  await founderPage.reload({ waitUntil: "networkidle" });
  await founderPage.waitForSelector("canvas.fractal-canvas", { timeout: 60_000 });
  await founderPage.waitForTimeout(12_000);
  const seqAfterReload = await readSeq(founder);
  console.log(`seq before reload: ${seqBeforeReload}, after reload: ${seqAfterReload}`);
  if (seqAfterReload <= seqBeforeReload) {
    throw new Error("reload did not increase persisted discovery seq");
  }

  console.log("4.3: two simultaneous founders converge toward shared discovery activity");
  const splitA = await browser.newContext();
  const splitB = await browser.newContext();
  const pageA = await splitA.newPage();
  const pageB = await splitB.newPage();
  await Promise.all([
    waitForApp(pageA),
    waitForApp(pageB),
  ]);
  await Promise.all([pageA.waitForTimeout(8_000), pageB.waitForTimeout(8_000)]);

  const seqA = await splitA.pages()[0].evaluate((key) => localStorage.getItem(key), SEQ_KEY);
  const seqB = await splitB.pages()[0].evaluate((key) => localStorage.getItem(key), SEQ_KEY);
  if (!seqA || !seqB) {
    throw new Error("split founders did not advertise on discovery channel");
  }

  console.log("acceptance checks passed");
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
