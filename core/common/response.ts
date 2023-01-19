// deno-lint-ignore-file no-explicit-any
export interface ResponseMessage {
  message: string;
  [K: string]: any;
}

export class Response {
  protected Status = true;
  protected StatusCode = 200;
  protected Messages?: ResponseMessage[];
  protected Data?: any;
  protected Metadata?: any;

  /**
   * Create a response object with status `true | false`
   * @param status
   * @returns
   */
  static status(status: boolean) {
    return new Response().status(status);
  }

  /**
   * Create a response object with HTTP response code
   * @param code
   * @returns
   */
  static statusCode(code: number) {
    return new Response().statusCode(code).status(!(code > 399));
  }

  /**
   * Create a response object with a message
   * @param message
   * @param metadata Optionally pass a metadata object.
   * @returns
   */
  static message(message: string, metadata?: Record<string, any>) {
    return new Response().message(message, metadata);
  }

  /**
   * Create a response object with data object
   * @param data
   * @param metadata Optionally pass a metadata object.
   * @returns
   */
  static data(data: Record<string, any>, metadata?: Record<string, any>) {
    return new Response().data(data, metadata);
  }

  /**
   * Create a response object with metadata object
   * @param metadata
   * @returns
   */
  static metadata(metadata: Record<string, any>) {
    return new Response().metadata(metadata);
  }

  constructor() {}

  /**
   * Set a status of your response `true | false`
   * @param status
   * @returns
   */
  public status(status: boolean) {
    this.Status = typeof status === "boolean" ? status : false;
    return this;
  }

  /**
   * Set a HTTP response code
   * @param code
   * @returns
   */
  public statusCode(code: number) {
    this.StatusCode = typeof code === "number" ? code : 500;
    return this;
  }

  /**
   * Set a message of your response
   * @param message
   * @param metadata Optionally pass a metadata object.
   * @returns
   */
  public message(message: string, metadata?: Record<string, any>) {
    const Message = {
      message: typeof message === "string" ? message : "No message!",
      ...metadata,
    };

    if (this.Messages instanceof Array) this.Messages.push(Message);
    else this.Messages = [Message];

    return this;
  }

  /**
   * Set multiple messages to your response
   * @param messages
   * @returns
   */
  public messages(messages: ResponseMessage[]) {
    this.Messages = messages;
    return this;
  }

  /**
   * Set a data object on your response
   * @param data
   * @param metadata Optionally pass a metadata object.
   * @returns
   */
  public data(data: Record<string, any>, metadata?: Record<string, any>) {
    if (typeof data === "object") this.Data = data;
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  /**
   * Set a metadata object on your response
   * @param metadata
   * @returns
   */
  public metadata(metadata: Record<string, any>) {
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  /**
   * Converts the current response object to a normalized object.
   * @returns
   */
  public toObject() {
    return {
      status: this.Status,
      messages: this.Messages,
      data: this.Data,
      metadata: this.Metadata,
    };
  }
}
