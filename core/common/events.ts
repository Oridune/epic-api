// deno-lint-ignore-file no-explicit-any
import { Context } from "oak";
import { RawResponse, Response } from "./response.ts";

export enum EventChannel {
  REQUEST = "request",
  CUSTOM = "custom",
}

export interface IEventPayload<T> {
  type: string;
  detail: T;
}

export type TEventCallback<T> = (
  event: IEventPayload<T>,
) => void;

/**
 * Events class is specifically created to reduce the complexity of event system in javascript and provide more developer friendly experience.
 */
export class Events {
  protected static events: Partial<
    Record<string, Set<(event: IEventPayload<any>) => any>>
  > = {};

  protected static _listen(
    channel: EventChannel,
    type: string,
    callback: TEventCallback<any>,
  ) {
    const event = Events.createEventId(channel, type);
    const listeners = Events.events[event] ??= new Set();

    listeners.add(callback);
  }

  protected static async _dispatch(
    channel: EventChannel,
    type: string,
    payload?: Omit<IEventPayload<any>, "type">,
  ) {
    const event = Events.createEventId(channel, type);
    const listeners = Events.events[event];

    if (!listeners) return false;

    await Promise.allSettled(
      Array.from(listeners).map(async (listener) => {
        await listener({
          type,
          detail: payload?.detail ?? null,
        });
      }),
    );

    return true;
  }

  protected static _remove(
    channel: EventChannel,
    type: string,
    callback: TEventCallback<any>,
  ) {
    const event = Events.createEventId(channel, type);
    const listeners = Events.events[event];

    if (!listeners) return;

    listeners.delete(callback);
  }

  /**
   * Creates the identifier for an event on a specific channel
   * @param channel Target channel
   * @param event Type of the event
   * @returns
   */
  static createEventId(channel: EventChannel, event: string) {
    return `epic-api-${channel}-${event}`;
  }

  /**
   * Triggers api request related events specifically
   * @param type Type of event to be triggered
   * @param payload Event payload
   * @returns
   */
  static dispatchRequestEvent(
    type: string,
    payload?: Omit<IEventPayload<any>, "type">,
  ) {
    return Events._dispatch(EventChannel.REQUEST, type, payload);
  }

  /**
   * Dispatch a custom event
   * @param event Type of event to be triggered
   * @param payload Event payload
   * @returns
   */
  static dispatch(type: string, payload?: Omit<IEventPayload<any>, "type">) {
    return Events._dispatch(EventChannel.CUSTOM, type, payload);
  }

  /**
   * Listen system event(s) on different channels
   * @param channel Specify the channel to listen on
   * @param event Type of event(s) to listen
   * @param callback This callback is called everytime the event(s) is/are triggered.
   * @returns
   */
  static listen(
    channel: EventChannel.CUSTOM,
    event: "response",
    callback: TEventCallback<{
      ctx: Context;
      res: Response | RawResponse;
      err: unknown;
    }>,
  ): void;
  static listen<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
  ): void;
  static listen<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
  ) {
    (event instanceof Array ? event : [event]).forEach((type) =>
      Events._listen(channel, type, callback)
    );
  }

  /**
   * Removes any event listeners that are registered
   * @param channel From which channel to be removed
   * @param event Type of event(s) to be removed
   * @param callback Provide the reference to the callback of the removable event(s)
   */
  static remove<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
  ) {
    (event instanceof Array ? event : [event]).forEach((type) =>
      Events._remove(channel, type, callback)
    );
  }
}
