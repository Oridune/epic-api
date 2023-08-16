// deno-lint-ignore-file no-explicit-any
export enum TransactionExecutionState {
  WAITING = "waiting",
  EXECUTING = "executing",
}

export interface ITransactionContext<State> {
  state: State;
}

export type NextFunction = (state?: Record<string, any>) => Promise<unknown>;

export type TransactionCallback<State> = (
  context: ITransactionContext<State>,
  next: NextFunction
) => Promise<void> | void;

export class Transaction {
  protected State = TransactionExecutionState.WAITING;
  protected Callbacks: Array<TransactionCallback<any>> = [];

  constructor() {}

  public add<State extends object>(callback: TransactionCallback<State>) {
    if (this.State === TransactionExecutionState.EXECUTING)
      throw new Error(
        `Cannot add logic to the transaction because it is executing!`
      );

    this.Callbacks.push(callback);

    return this;
  }

  public async exec() {
    if (this.State === TransactionExecutionState.EXECUTING) {
      console.warn("Transaction is already being executed!");
      return;
    }

    this.State = TransactionExecutionState.EXECUTING;

    const Context = {
      index: 0,
      state: {},
    };

    const Next: NextFunction = async (state) => {
      if (Context.index < this.Callbacks.length) {
        const Callback = this.Callbacks[Context.index];

        Context.state = { ...Context.state, ...state };
        Context.index++;

        return await Callback(Context, Next);
      }
    };

    await Next();

    this.State = TransactionExecutionState.WAITING;
  }
}
