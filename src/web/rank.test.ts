import { Browser } from "../Browser";
import { CONFIG } from "../config";
import { computeSimilarityScores } from "./rank";
import { QAWolf } from "./index";

const step = {
  selector: {
    xpath: "xpath"
  },
  sourceEventId: 11,
  type: "click" as "click"
};

const base = {
  classList: ["spirit", "bobcat", "moose"],
  href: null,
  id: "spirit",
  inputType: "submit",
  labels: null,
  name: null,
  parentText: ["some text", "even more text"],
  placeholder: null,
  tagName: "input",
  textContent: "click me!"
};

let browser: Browser;

beforeAll(async () => {
  browser = new Browser();
  // "The Internet" https://github.com/tourdedave/the-internet
  await browser.launch();
});

afterAll(() => browser.close());

describe("rank.computeScoresForElements", () => {
  test("returns scores for each element", async () => {
    const stepWithSelector = {
      ...step,
      selector: { ...base, tagName: "input" }
    };

    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const scores = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.computeSimilarityScores(
        step,
        document.getElementsByTagName("input")
      );
    }, stepWithSelector);

    expect(scores).toEqual([100, 100]);
  });

  test("throws error if step does not have selector", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const step = {
      selector: {
        xpath: "xpath"
      },
      sourceEventId: 11,
      type: "click" as "click"
    };

    expect(() => {
      computeSimilarityScores(step, new HTMLCollection());
    }).toThrowError();
  });
});

describe("rank.findCandidateElements", () => {
  test("returns all elements for click step", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const elements = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.findCandidateElements(step);
    }, step);

    expect(elements.length).toBe(45);
  });

  test("returns only inputs for type step", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const typeAction = {
      ...step,
      type: "type" as "type",
      value: "spirit"
    };

    const elements = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.findCandidateElements(step);
    }, typeAction);

    expect(elements.length).toBe(2);
  });
});

describe("rank.findHighestMatchXpath", () => {
  test("returns null if no elements similar enough", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const stepWithSelector = {
      ...step,
      selector: base
    };

    const highestMatch = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.findHighestMatchXpath(step);
    }, stepWithSelector);

    expect(highestMatch).toBeNull();
  });

  test("returns null if a tie is found", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/checkboxes`);
    await browser.injectSdk();

    const stepWithSelector = {
      ...step,
      selector: {
        ...base,
        classList: null,
        id: null,
        inputType: "checkbox",
        textContent: null
      },
      type: "type"
    };

    const highestMatch = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.findHighestMatchXpath(step);
    }, stepWithSelector);

    expect(highestMatch).toBeNull();
  });

  test("returns xpath of highest match if one found", async () => {
    await browser._browser!.url(`${CONFIG.testUrl}/login`);
    await browser.injectSdk();

    const stepWithSelector = {
      ...step,
      selector: {
        ...base,
        classList: null,
        id: null,
        inputType: "password",
        labels: ["password"],
        textContent: null
      },
      type: "type"
    };

    const highestMatch = await browser._browser!.execute(step => {
      const qawolf: QAWolf = (window as any).qawolf;

      return qawolf.rank.findHighestMatchXpath(step);
    }, stepWithSelector);

    expect(highestMatch).toBe("//*[@id='password']");
  });
});