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

/**
 * Transaction class lets you execute multiple transactions scattered in the project as a single transaction.
 * 
 * If one of the transactions failed, other transactions will also fail.

 * For example: If a user deletion is triggered, and somewhere in the code there is a logic that need be successfully executed if a user is deleted, this class makes sure that the user is not deleted until that code is executed successfully.
 */
export class Transaction {
  protected State = TransactionExecutionState.WAITING;
  protected Callbacks: Array<TransactionCallback<any>> = [];

  /**
   * Add a transaction callback to the transaction queue
   * @param callback
   * @returns
   */
  static add<State extends object>(callback: TransactionCallback<State>) {
    return new Transaction().add<State>(callback);
  }

  /**
   * Add a transaction callback to the transaction queue
   * @param callback
   * @returns
   */
  public add<State extends object>(callback: TransactionCallback<State>) {
    if (this.State === TransactionExecutionState.EXECUTING)
      throw new Error(
        `Cannot add logic to the transaction because it is executing!`
      );

    this.Callbacks.push(callback);

    return this;
  }

  /**
   * Execute all queued transactions
   * @returns
   */
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
