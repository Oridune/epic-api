import type { ObjectId, TRequestOptions, TRequestExecutors, TResponseShape } from "../types.js";





export type TRoute$api$memoryUsage = {
    query: {},
    params: {},
    body: {},
    return: { status: boolean; data: undefined },
};




export type TRoute$api$postman = {
    query: {
		name?: string;
		description?: string;
},
    params: {},
    body: {},
    return: { status: boolean; data: undefined },
};




export type TRoute$api$test = {
    query: {},
    params: {},
    body: {},
    return: { status: boolean; data: undefined },
};




export type TRoute$api$home = {
    query: {},
    params: {},
    body: {},
    return: {
		status: boolean;
		data: {
		environment: "development" | "production" | "test";
		database: {
		connected: boolean;
};
		store: {
		type: "map" | "redis" | "deno-kv";
		connected: boolean;
};
		languages: Array<string>;
};
		messages?: Array<{
		message?: string;
		location?: string;
		name?: string;
} & { [K: string]: any }
>;
		metrics?: /*(optional)*/{
		handledInMs?: number;
		respondInMs?: number;
} & { [K: string]: any }
;
		metadata?: /*(optional)*/{
} & { [K: string]: any }
;
},
};




export type TRoute$api$heapSnapshot = {
    query: {},
    params: {},
    body: {},
    return: { status: boolean; data: undefined },
};


export interface IController$api {
    memoryUsage(): TRequestExecutors<TRoute$api$memoryUsage["return"]>;
    memoryUsage<
        Method extends "get",
        QueryShape extends TRoute$api$memoryUsage["query"],
        ParamsShape extends TRoute$api$memoryUsage["params"],
        BodyShape extends TRoute$api$memoryUsage["body"],
        ReturnShape extends TResponseShape<any> = TRoute$api$memoryUsage["return"],
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions<ReturnShape>): TRequestExecutors<ReturnShape, BodyShape>;
    postman(): TRequestExecutors<TRoute$api$postman["return"]>;
    postman<
        Method extends "get",
        QueryShape extends TRoute$api$postman["query"],
        ParamsShape extends TRoute$api$postman["params"],
        BodyShape extends TRoute$api$postman["body"],
        ReturnShape extends TResponseShape<any> = TRoute$api$postman["return"],
    >(data: {
        method?: Method;
        query: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions<ReturnShape>): TRequestExecutors<ReturnShape, BodyShape>;
    test(): TRequestExecutors<TRoute$api$test["return"]>;
    test<
        Method extends "get",
        QueryShape extends TRoute$api$test["query"],
        ParamsShape extends TRoute$api$test["params"],
        BodyShape extends TRoute$api$test["body"],
        ReturnShape extends TResponseShape<any> = TRoute$api$test["return"],
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions<ReturnShape>): TRequestExecutors<ReturnShape, BodyShape>;
    home(): TRequestExecutors<TRoute$api$home["return"]>;
    home<
        Method extends "get",
        QueryShape extends TRoute$api$home["query"],
        ParamsShape extends TRoute$api$home["params"],
        BodyShape extends TRoute$api$home["body"],
        ReturnShape extends TResponseShape<any> = TRoute$api$home["return"],
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions<ReturnShape>): TRequestExecutors<ReturnShape, BodyShape>;
    heapSnapshot(): TRequestExecutors<TRoute$api$heapSnapshot["return"]>;
    heapSnapshot<
        Method extends "get",
        QueryShape extends TRoute$api$heapSnapshot["query"],
        ParamsShape extends TRoute$api$heapSnapshot["params"],
        BodyShape extends TRoute$api$heapSnapshot["body"],
        ReturnShape extends TResponseShape<any> = TRoute$api$heapSnapshot["return"],
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions<ReturnShape>): TRequestExecutors<ReturnShape, BodyShape>;
}

export const apiModule = (sdk: any): IController$api => ({

    memoryUsage(data?: any) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios) throw new Error("Axios not initialized!");

            sdk.checkPermission("api", "memoryUsage");

            const url = Object.entries<string>(data?.params ?? {}).reduce(
                (endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value),
                "/api/memory/usage"
            ).replace(/:\w+\?\/?/g, "");

            const res = await sdk._axios.request({
                method: data?.method ?? "get" ?? "get",
                url,
                params: data?.query,
                data: data?.body,
                signal: data?.signal,
                ...data?.axiosConfig,
            });

            return res;
        }, data);
    },

    postman(data?: any) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios) throw new Error("Axios not initialized!");

            sdk.checkPermission("api", "postman");

            const url = Object.entries<string>(data?.params ?? {}).reduce(
                (endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value),
                "/api/postman"
            ).replace(/:\w+\?\/?/g, "");

            const res = await sdk._axios.request({
                method: data?.method ?? "get" ?? "get",
                url,
                params: data?.query,
                data: data?.body,
                signal: data?.signal,
                ...data?.axiosConfig,
            });

            return res;
        }, data);
    },

    test(data?: any) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios) throw new Error("Axios not initialized!");

            sdk.checkPermission("api", "test");

            const url = Object.entries<string>(data?.params ?? {}).reduce(
                (endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value),
                "/api/test"
            ).replace(/:\w+\?\/?/g, "");

            const res = await sdk._axios.request({
                method: data?.method ?? "get" ?? "get",
                url,
                params: data?.query,
                data: data?.body,
                signal: data?.signal,
                ...data?.axiosConfig,
            });

            return res;
        }, data);
    },

    home(data?: any) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios) throw new Error("Axios not initialized!");

            sdk.checkPermission("api", "home");

            const url = Object.entries<string>(data?.params ?? {}).reduce(
                (endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value),
                "/api"
            ).replace(/:\w+\?\/?/g, "");

            const res = await sdk._axios.request({
                method: data?.method ?? "get" ?? "get",
                url,
                params: data?.query,
                data: data?.body,
                signal: data?.signal,
                ...data?.axiosConfig,
            });

            return res;
        }, data);
    },

    heapSnapshot(data?: any) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios) throw new Error("Axios not initialized!");

            sdk.checkPermission("api", "heapSnapshot");

            const url = Object.entries<string>(data?.params ?? {}).reduce(
                (endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value),
                "/api/heap/snapshot/:filename?"
            ).replace(/:\w+\?\/?/g, "");

            const res = await sdk._axios.request({
                method: data?.method ?? "get" ?? "get",
                url,
                params: data?.query,
                data: data?.body,
                signal: data?.signal,
                ...data?.axiosConfig,
            });

            return res;
        }, data);
    },

});