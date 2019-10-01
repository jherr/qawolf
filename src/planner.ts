import { eventWithTime, metaEvent, mousemoveData } from "rrweb/typings/types";
import { BrowserStep, Job } from "./types";
import { qaEventWithTime } from "./events";

const SCROLL_XPATH = "scroll";

export const findHref = (events: eventWithTime[]): string =>
  (events[0] as metaEvent).data.href;

const isScrollEvent = (event: qaEventWithTime): boolean => {
  return event.data && event.data.source === 3 && event.data.id === 1;
};

export const orderEventsByTime = (
  events: eventWithTime[]
): qaEventWithTime[] => {
  const orderedEvents = [];

  for (let originalEvent of events) {
    let event = JSON.parse(JSON.stringify(originalEvent));

    // replace negative timeOffsets so we can correctly order events by timestamp
    const positions =
      (event.data && (event.data as mousemoveData).positions) || [];
    if (positions.length) {
      const firstOffset = positions[0].timeOffset;
      event.timestamp += firstOffset;
      for (const position of positions) {
        position.timeOffset -= firstOffset;
      }
    }

    orderedEvents.push(event);
  }

  orderedEvents.sort((a, b) => a.timestamp - b.timestamp);

  orderedEvents.forEach((event, index) => (event.id = index));

  return orderedEvents;
};

export const isMouseDownEvent = (event: qaEventWithTime | null): boolean => {
  if (!event || !event.data) return false;

  const data = event.data;
  return !!(data.source === 2 && data.type === 1 && data.isTrusted);
};

export const isTypeEvent = (event: qaEventWithTime | null): boolean => {
  if (!event || !event.data) return false;

  const data = event.data;
  return !!(data.source === 5 && data.isTrusted && data.text);
};

const partitionScrollEvents = (
  events: qaEventWithTime[]
): qaEventWithTime[][] => {
  const filteredEvents = events.filter(event => {
    return (
      isMouseDownEvent(event) || isScrollEvent(event) || isTypeEvent(event)
    );
  });

  const partitionedScrollEvents: qaEventWithTime[][] = [];
  let currentScrollEvents: qaEventWithTime[] = [];

  filteredEvents.forEach(event => {
    if (isScrollEvent(event)) {
      currentScrollEvents.push(event);
    } else if (currentScrollEvents.length) {
      partitionedScrollEvents.push(currentScrollEvents);
      currentScrollEvents = [];
    }
  });

  if (currentScrollEvents.length) {
    partitionedScrollEvents.push(currentScrollEvents);
  }

  return partitionedScrollEvents;
};

export const planClickActions = (events: qaEventWithTime[]): BrowserStep[] => {
  const steps: BrowserStep[] = [];

  for (let event of events) {
    if (!isMouseDownEvent(event)) continue;

    steps.push({
      locator: (event.data as any).properties,
      pageId: (event as any).pageId,
      sourceEventId: event.id,
      type: "click"
    });
  }

  return steps;
};

export const planJob = (originalEvents: eventWithTime[]): Job => {
  const url = findHref(originalEvents);

  const events = orderEventsByTime(originalEvents);

  const steps: BrowserStep[] = planClickActions(events)
    .concat(planScrollActions(events))
    .concat(planTypeActions(events));
  steps.sort((a, b) => a.sourceEventId - b.sourceEventId);
  // TODO: need to get actual name
  const job = { name: "job", steps, url };

  return job;
};

export const planScrollActions = (events: qaEventWithTime[]): BrowserStep[] => {
  const partitionedScrollEvents = partitionScrollEvents(events);
  const steps: BrowserStep[] = [];

  partitionedScrollEvents.forEach(eventList => {
    const lastEvent = eventList[eventList.length - 1];

    steps.push({
      locator: { xpath: SCROLL_XPATH },
      scrollDirection: eventList[0].data.y <= lastEvent.data.y ? "down" : "up",
      scrollTo: lastEvent.data.y,
      sourceEventId: lastEvent.id,
      type: "scroll"
    });
  });

  return steps;
};

export const planTypeActions = (events: qaEventWithTime[]): BrowserStep[] => {
  const steps: BrowserStep[] = [];

  let lastXpath = null;

  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (!isTypeEvent(event)) continue;

    // only include last consecutive type per xpath
    if (event.data.xpath === lastXpath) continue;

    steps.push({
      locator: (event.data as any).properties,
      pageId: (event as any).pageId,
      sourceEventId: event.id,
      type: "type",
      value: event.data.text
    });

    lastXpath = event.data.xpath;
  }

  return steps;
};
