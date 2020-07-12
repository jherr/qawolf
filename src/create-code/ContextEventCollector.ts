import Debug from 'debug';
import { EventEmitter } from 'events';
import { BrowserContext } from 'playwright-core';
import { webScript } from '../web/addScript';
import { loadConfig } from '../config';
import { ElementEvent } from '../types';
import { indexPages, IndexedPage, forEachPage } from '../utils';

const debug = Debug('qawolf:ContextEventCollector');

export class ContextEventCollector extends EventEmitter {
  readonly _attribute: string;
  readonly _context: BrowserContext;

  public static async create(
    context: BrowserContext,
  ): Promise<ContextEventCollector> {
    const collector = new ContextEventCollector(context);
    await collector._start();
    return collector;
  }

  protected constructor(context: BrowserContext) {
    super();
    this._attribute = loadConfig().attribute;
    this._context = context;
  }

  async _start() {
    await indexPages(this._context);

    await this._context.exposeBinding(
      'qawElementEvent',
      ({ page }, elementEvent: ElementEvent) => {
        const pageIndex = (page as IndexedPage).createdIndex;
        const event: ElementEvent = { ...elementEvent, page: pageIndex };
        debug(`emit %j`, event);
        this.emit('elementevent', event);
      },
    );

    const script =
      `window.qawAttribute = ${JSON.stringify(this._attribute)};` + webScript;

    await this._context.addInitScript(script);
    await Promise.all(
      this._context.pages().map((page) => {
        page.evaluate(script);
      }),
    );
  }
}
