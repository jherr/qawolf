import fs from "fs-extra";
import { BrowserObject, remote } from "webdriverio";
import { CONFIG } from "./config";
import { logger } from "./logger";

export class Browser {
  public _browser: BrowserObject | null = null;
  private _sdk: string | null = null;

  public async close(): Promise<void> {
    logger.debug("Browser: close");
    await this._browser!.closeWindow();
  }

  public async injectSdk() {
    if (!this._sdk) {
      this._sdk = await fs.readFile("build/qawolf.web.js", "utf8");
    }

    return this._browser!.execute(this._sdk);
  }

  public async launch(desiredCapabilities?: WebDriver.DesiredCapabilities) {
    logger.debug("Browser: launch");

    this._browser = await remote({
      // default to chrome
      capabilities: desiredCapabilities || this.getChromeCapabilities(),
      logLevel: "warn",
      port: CONFIG.seleniumPort
    });

    this._browser!.setTimeout({ script: 300 * 1000 });
  }

  private getChromeCapabilities() {
    const chromeOptions = {
      args: [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--window-position=0,0"
      ],

      // disable "Chrome is being controlled by automated software"
      // https://github.com/GoogleChrome/puppeteer/issues/2070#issuecomment-521313694
      excludeSwitches: ["enable-automation"],
      useAutomationExtension: false
    };

    // disable "Chrome is being controlled by automated software"
    // from https://github.com/Codeception/CodeceptJS/issues/563#issuecomment-310688797
    (chromeOptions as any).prefs = { credentials_enable_service: false };

    if (CONFIG.fullScreen) {
      chromeOptions.args.push("--kiosk");
    }

    const capabilities = {
      browserName: "chrome",
      "goog:chromeOptions": chromeOptions
    };
    return capabilities;
  }
}
