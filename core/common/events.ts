// deno-lint-ignore-file no-explicit-any
import { Context } from "oak";
import { RawResponse, Response } from "./response.ts";

export enum EventChannel {
  REQUEST = "request",
  CUSTOM = "custom",
}

export interface IListener {
  remove: (options?: boolean | EventListenerOptions) => void;
}

export type TEventCallback<T> = (
  this: IListener,
  event: CustomEvent<T>,
) => void;

/**
 * Events class is specifically created to reduce the complexity of event system in javascript and provide more developer friendly experience.
 */
export class Events {
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
   * @param event Type of event to be triggered
   * @param detail
   * @returns
   */
  static dispatchRequestEvent(event: string, detail?: any) {
    return dispatchEvent(
      new CustomEvent(Events.createEventId(EventChannel.REQUEST, event), {
        detail,
      }),
    );
  }

  /**
   * Dispatch a custom event
   * @param event Type of event to be triggered
   * @param eventInitDict Custom event options
   * @returns
   */
  static dispatch(event: string, eventInitDict?: CustomEventInit<unknown>) {
    return dispatchEvent(
      new CustomEvent(
        Events.createEventId(EventChannel.CUSTOM, event),
        eventInitDict,
      ),
    );
  }

  /**
   * Listen system event(s) on different channels
   * @param channel Specify the channel to listen on
   * @param event Type of event(s) to listen
   * @param callback This callback is called everytime the event(s) is/are triggered.
   * @param options
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
    options?: boolean | AddEventListenerOptions,
  ): IListener;
  static listen<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
    options?: boolean | AddEventListenerOptions,
  ): IListener;
  static listen<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
    options?: boolean | AddEventListenerOptions,
  ) {
    const Listener: IListener = {
      remove: (opts) => Events.remove(channel, event, callback, opts),
    };

    (event instanceof Array ? event : [event]).map((ev) =>
      addEventListener(
        Events.createEventId(channel, ev),
        callback.bind(Listener) as () => void,
        options,
      )
    );

    return Listener;
  }

  /**
   * Removes any event listeners that are registered
   * @param channel From which channel to be removed
   * @param event Type of event(s) to be removed
   * @param callback Provide the reference to the callback of the removable event(s)
   * @param options
   */
  static remove<T>(
    channel: EventChannel,
    event: string | string[],
    callback: TEventCallback<T>,
    options?: boolean | EventListenerOptions,
  ) {
    (event instanceof Array ? event : [event]).map((ev) =>
      removeEventListener(
        Events.createEventId(channel, ev),
        callback as () => void,
        options,
      )
    );
  }
}
