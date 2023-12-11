export interface ITransactionQueueContext<Input, State> {
  input: Input;
  state: State;
}

export type NextFunction<NextState> = (state: NextState) => Promise<unknown>;

export type TransactionQueueCallback<Input, State, NextState> = (
  context: ITransactionQueueContext<Input, State>,
  next: NextFunction<NextState>
) => Promise<void> | void;

export class TransactionQueue<
  Input extends object | void,
  State extends object
> {
  protected Callbacks: Array<
    TransactionQueueCallback<Input, State, object | void>
  > = [];

  /**
   * Add a transaction callback to the queue
   * @param callback
   * @returns
   */
  static add<
    Input extends object | void,
    NextState extends object | void = void
  >(callback: TransactionQueueCallback<Input, object, NextState>) {
    return new TransactionQueue<Input, object>().add<NextState>(callback);
  }

  /**
   * Add a transaction callback to the queue
   * @param callback
   * @returns
   */
  public add<NextState extends object | void>(
    callback: TransactionQueueCallback<Input, State, NextState>
  ) {
    this.Callbacks.push(callback);

    return this as unknown as TransactionQueue<
      Input,
      State & (NextState extends void ? object : NextState)
    >;
  }

  /**
   * Execute the queue
   * @returns
   */
  public async exec(input: Input) {
    const Context = {
      index: 0,
      input: input,
      state: {} as State,
    };

    const Next: NextFunction<void | object> = async (state) => {
      if (Context.index < this.Callbacks.length) {
        const Callback = this.Callbacks[Context.index];

        if (typeof state === "object")
          Context.state = { ...Context.state, ...state };

        Context.index++;

        return await Callback(Context, Next);
      }
    };

    await Next();
  }
}
