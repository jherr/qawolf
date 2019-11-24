import { Action, Locator } from "@qawolf/types";
import { getDataValue, isVisible } from "./element";
import { topMatch } from "./match.remove";
import { waitFor } from "./wait";
import { findElementByXpath, getXpath } from "./xpath";

type QueryByDataArgs = {
  action: Action;
  dataAttribute?: string;
  dataValue?: string;
};

export const queryActionElements = (action: Action): HTMLElement[] => {
  const selector =
    action === "type" ? "input,select,textarea,[contenteditable='true']" : "*";

  return queryVisibleElements(selector);
};

export const queryDataElements = ({
  action,
  dataAttribute,
  dataValue
}: QueryByDataArgs): HTMLElement[] => {
  let dataSelector = `[${dataAttribute}='${dataValue}']`;
  if (action === "type") {
    const selector = `input${dataSelector},select${dataSelector},textarea${dataSelector},[contenteditable="true"]${dataSelector}`;
    return queryVisibleElements(selector);
  }

  return queryVisibleElements(dataSelector);
};

export const queryVisibleElements = (selector: string): HTMLElement[] => {
  const elements = document.querySelectorAll(selector);

  const visibleElements: HTMLElement[] = [];

  for (let i = 0; i < elements.length; i++) {
    // we do not pass computedStyle because doing
    // that for every element would be very expensive
    if (isVisible(elements[i] as HTMLElement)) {
      visibleElements.push(elements[i] as HTMLElement);
    }
  }

  return visibleElements;
};

export const findElement = async ({
  action,
  dataAttribute,
  target,
  timeoutMs,
  value
}: Locator) => {
  if (dataAttribute && target.dataValue) {
    console.log(
      `finding element by data attribute ${dataAttribute}=${target.dataValue}`,
      target
    );
    return waitFor(() => {
      const elements = queryDataElements({
        action,
        dataAttribute,
        dataValue: target.dataValue!
      });

      const match = topMatch({ dataAttribute, target, elements, value });
      if (match) return match.element;

      return null;
    }, timeoutMs);
  }

  // return root elements right away
  if (target.xpath === "/html" || target.xpath === "/html/body")
    return findElementByXpath(target.xpath);

  console.log("waiting for top strong match", target);

  const strongMatch = await waitFor(() => {
    const elements = queryActionElements(action);
    return topMatch({
      dataAttribute,
      target,
      elements,
      requireStrongMatch: true,
      value
    });
  }, timeoutMs);
  if (strongMatch) return strongMatch.element;

  console.log(
    "no strong match found before timeout, choosing top weak match",
    target
  );
  const elements = queryActionElements(action);
  const match = topMatch({ dataAttribute, target, elements, value });
  if (match) return match.element;

  return null;
};
