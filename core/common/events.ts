// deno-lint-ignore-file no-explicit-any

export enum EventChannel {
  REQUEST = "request",
  CUSTOM = "custom",
}

export interface IListener {
  remove: (options?: boolean | EventListenerOptions) => void;
}

export type TEventCallback<T> = (
  this: IListener,
  event: CustomEvent<T>
) => void;

export class Events {
  static createEventId(channel: EventChannel, event: string) {
    return `epic-api-${channel}-${event}`;
  }

  static dispatchRequestEvent(event: string, detail?: any) {
    return dispatchEvent(
      new CustomEvent(Events.createEventId(EventChannel.REQUEST, event), {
        detail,
      })
    );
  }

  static dispatch(event: string, eventInitDict?: CustomEventInit<unknown>) {
    return dispatchEvent(
      new CustomEvent(
        Events.createEventId(EventChannel.CUSTOM, event),
        eventInitDict
      )
    );
  }

  static listen<T>(
    channel: EventChannel,
    event: string,
    callback: TEventCallback<T>,
    options?: boolean | AddEventListenerOptions
  ) {
    const Listener: IListener = {
      remove: () => Events.remove(channel, event, callback, options),
    };

    addEventListener(
      Events.createEventId(channel, event),
      callback.bind(Listener) as () => void,
      options
    );

    return Listener;
  }

  static remove<T>(
    channel: EventChannel,
    event: string,
    callback: TEventCallback<T>,
    options?: boolean | EventListenerOptions
  ) {
    return removeEventListener(
      Events.createEventId(channel, event),
      callback as () => void,
      options
    );
  }
}
