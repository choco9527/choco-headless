import {NextResponse} from "next/server";
import fs from "node:fs";
import path from "node:path";
import cfCheck from "@/utils/cfCheck";
import {
  localExecutablePath,
  isDev,
  userAgent,
  remoteExecutablePath,
  getVideoFrame
} from "@/utils/utils";
import {launchConfigAll, launchConfigSimple, VIDEO_ID} from "@/utils/constants";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds (update by 2024-05-10)
export const dynamic = "force-dynamic";

const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");

export async function GET(request) {
  const url = new URL(request.url);
  const urlStr = url.searchParams.get("url");
  if (!urlStr) {
    return NextResponse.json(
      {error: "Missing url parameter"},
      {status: 400}
    );
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      ignoreDefaultArgs: ["--enable-automation"],
      args: isDev
        ? [
          ...launchConfigSimple,
        ]
        : [...chromium.args, "--disable-blink-features=AutomationControlled"],
      defaultViewport: {width: 1920, height: 1080},
      executablePath: isDev ? localExecutablePath : await chromium.executablePath(remoteExecutablePath),
      headless: isDev ? false : "new",
      debuggingPort: isDev ? 9222 : undefined,
    });

    const pages = await browser.pages();
    const page = pages[0];
    await page.setUserAgent(userAgent);
    const preloadFile = fs.readFileSync(
      path.join(process.cwd(), "/src/utils/preload.js"),
      "utf8"
    );
    await page.evaluateOnNewDocument(preloadFile);
    await page.goto(urlStr, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await cfCheck(page);
    console.log("page title", await page.title());

    await page.waitForSelector(VIDEO_ID, {timeout: 60000});
    // await page.keyboard.press('F')
    const base64 = await getVideoFrame(page, VIDEO_ID);

    return NextResponse.json({ base64 }, { status: 200 });

  } catch (err) {
    console.log(err);
    return NextResponse.json(
      {error: "Internal Server Error"},
      {status: 500}
    );
  } finally {
    await browser.close();
  }
}
