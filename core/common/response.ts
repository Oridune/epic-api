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

  static status(status: boolean) {
    return new Response().status(status);
  }

  static statusCode(code: number) {
    return new Response().statusCode(code).status(!(code > 399));
  }

  static message(message: string, metadata?: Record<string, any>) {
    return new Response().message(message, metadata);
  }

  static data(data: Record<string, any>, metadata?: Record<string, any>) {
    return new Response().data(data, metadata);
  }

  static metadata(metadata: Record<string, any>) {
    return new Response().metadata(metadata);
  }

  constructor() {}

  public status(status: boolean) {
    this.Status = typeof status === "boolean" ? status : false;
    return this;
  }

  public statusCode(code: number) {
    this.StatusCode = typeof code === "number" ? code : 500;
    return this;
  }

  public message(message: string, metadata?: Record<string, any>) {
    const Message = {
      message: typeof message === "string" ? message : "No message!",
      ...metadata,
    };

    if (this.Messages instanceof Array) this.Messages.push(Message);
    else this.Messages = [Message];

    return this;
  }

  public messages(messages: ResponseMessage[]) {
    this.Messages = messages;
    return this;
  }

  public data(data: Record<string, any>, metadata?: Record<string, any>) {
    if (typeof data === "object") this.Data = data;
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  public metadata(metadata: Record<string, any>) {
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  public toObject() {
    return {
      status: this.Status,
      messages: this.Messages,
      data: this.Data,
      metadata: this.Metadata,
    };
  }
}
