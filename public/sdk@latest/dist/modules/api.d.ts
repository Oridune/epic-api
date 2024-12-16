import type { TRequestOptions, TResponseShape, TRequestExecutors } from "../types.ts";
export interface IController$api {
    postman(): TRequestExecutors<TResponseShape<{}>>;
    postman<Method extends "get", QueryShape extends {
        name?: string;
        description?: string;
    }, ParamsShape extends {}, BodyShape extends {}>(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<{}>, BodyShape>;
    test(): TRequestExecutors<TResponseShape<{}>>;
    test<Method extends "get", QueryShape extends {}, ParamsShape extends {}, BodyShape extends {}>(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<{}>, BodyShape>;
    home(): TRequestExecutors<TResponseShape<{}>>;
    home<Method extends "get", QueryShape extends {}, ParamsShape extends {}, BodyShape extends {}>(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<{}>, BodyShape>;
}
export declare const apiModule: (sdk: any) => IController$api;
