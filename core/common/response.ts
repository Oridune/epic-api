// deno-lint-ignore-file no-explicit-any

export class RawResponse {
  protected StatusCode = 200;
  protected Headers = new Headers();
  protected Type?: string;
  protected Body?: any;

  /**
   * Create a response object with HTTP response code
   * @param code
   * @returns
   */
  static statusCode(code: number) {
    return new RawResponse().statusCode(code);
  }

  /**
   * Create a response object with a header appended
   * @param name
   * @param value
   * @returns
   */
  static header(name: string, value: string) {
    return new RawResponse().header(name, value);
  }

  /**
   * Create a response object with the given headers
   * @param headers
   * @returns
   */
  static headers(headers: Headers) {
    return new RawResponse().headers(headers);
  }

  /**
   * Create a response object
   * @param body
   * @param type
   * @returns
   */
  static body(body: any, type?: string) {
    return new RawResponse(body, type);
  }

  constructor(body?: any, type?: string) {
    if (body) this.body(body);
    if (type) this.type(type);
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
   * Set a header of your response
   * @param name
   * @param value
   * @returns
   */
  public header(name: string, value: string) {
    this.Headers.append(name, value);
    return this;
  }

  /**
   * Set the headers of your response
   * @param headers
   * @returns
   */
  public headers(headers: Headers) {
    this.Headers = headers;
    return this;
  }

  /**
   * Set the response body
   * @param body
   * @param type
   * @returns
   */
  public body(body: any, type?: string) {
    this.Body = body;
    if (type) this.type(type);
    return this;
  }

  /**
   * Set the response type
   * @param type
   * @returns
   */
  public type(type: string) {
    this.Type = type;
    return this;
  }

  /**
   * Get HTTP Status Code
   * @returns
   */
  public getStatusCode() {
    return this.StatusCode;
  }

  /**
   * Get HTTP Headers
   * @returns
   */
  public getHeaders() {
    return this.Headers;
  }

  /**
   * Get the Body
   * @returns
   */
  public getBody() {
    return this.Body;
  }
}

export interface ResponseMessage {
  message: string;
  [K: string]: any;
}

export interface ResponseBody<D, M> {
  status: boolean;
  messages?: Array<ResponseMessage>;
  data?: D;
  metadata?: M;
  errorStack?: string;
}

export class Response<D = Record<string, any>, M = Record<string, any>> {
  protected StatusCode = 200;
  protected Headers = new Headers();

  protected Status = true;
  protected Messages?: ResponseMessage[];
  protected Data?: D;
  protected Metadata?: M;
  protected ErrorStack?: string;

  /**
   * Create a raw response object
   * @param body
   * @param type
   * @returns
   */
  static raw(body: any, type?: string) {
    return new RawResponse(body, type);
  }

  /**
   * Create a response object with status `true | false`
   * @param status
   * @returns
   */
  static status(status: boolean) {
    return new Response().status(status);
  }

  /**
   * Create a response object with status `true`
   * @returns
   */
  static true() {
    return Response.status(true);
  }

  /**
   * Create a response object with status `false`
   * @returns
   */
  static false() {
    return Response.status(false);
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
   * Create a response object with HTTP response code `200`
   * @returns
   */
  static ok() {
    return Response.statusCode(200);
  }

  /**
   * Create a response object with HTTP response code `201`
   * @returns
   */
  static created() {
    return Response.statusCode(201);
  }

  /**
   * Create a response object with HTTP response code `401`
   * @returns
   */
  static unauthorized() {
    return Response.statusCode(401);
  }

  /**
   * Create a response object with HTTP response code `404`
   * @returns
   */
  static notFound() {
    return Response.statusCode(404);
  }

  /**
   * Create a response object with a header appended
   * @param name
   * @param value
   * @returns
   */
  static header(name: string, value: string) {
    return new Response().header(name, value);
  }

  /**
   * Create a response object with the given headers
   * @param headers
   * @returns
   */
  static headers(headers: Headers) {
    return new Response().headers(headers);
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
   * Create a response object with multiple messages
   * @param messages
   * @returns
   */
  static messages(messages: ResponseMessage[]) {
    return new Response().messages(messages);
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

  /**
   * Create a response with an error stack
   * @param stack Error stack information
   */
  static errorStack(stack: string) {
    return new Response().errorStack(stack);
  }

  constructor(data?: any, metadata?: M) {
    if (data) this.data(data);
    if (metadata) this.metadata(metadata);
  }

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
   * Set a header of your response
   * @param name
   * @param value
   * @returns
   */
  public header(name: string, value: string) {
    this.Headers.append(name, value);
    return this;
  }

  /**
   * Set the headers of your response
   * @param headers
   * @returns
   */
  public headers(headers: Headers) {
    this.Headers = headers;
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
  public data(data: D, metadata?: M) {
    if (typeof data === "object") this.Data = data;
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  /**
   * Set a metadata object on your response
   * @param metadata
   * @returns
   */
  public metadata(metadata: M) {
    if (typeof metadata === "object") this.Metadata = metadata;
    return this;
  }

  /**
   * Set an error stack on your response
   * @param stack Error stack information
   * @returns
   */
  public errorStack(stack: string) {
    if (typeof stack === "string") this.ErrorStack = stack;
    return this;
  }

  /**
   * Get HTTP Status Code
   * @returns
   */
  public getStatusCode() {
    return this.StatusCode;
  }

  /**
   * Get HTTP Headers
   * @returns
   */
  public getHeaders() {
    return this.Headers;
  }

  /**
   * Converts the current response object to a normalized body.
   * @returns
   */
  public getBody(): ResponseBody<D, M> {
    return {
      status: this.Status,
      messages: this.Messages,
      data: this.Data,
      metadata: this.Metadata,
      errorStack: this.ErrorStack,
    };
  }
}
