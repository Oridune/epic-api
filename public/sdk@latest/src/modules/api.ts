import type { ObjectId, TRequestOptions, TResponseShape, TRequestExecutors } from "../types.ts";

export interface IController$api {
    
                
            postman(): TRequestExecutors<TResponseShape<
        {}
    >>;
        postman<
        Method extends "get",
        QueryShape extends {
		name?: string;
		description?: string;
},
        ParamsShape extends {},
        BodyShape extends {},
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<
        {}
    >, BodyShape>;
        
                
            test(): TRequestExecutors<TResponseShape<
        {}
    >>;
        test<
        Method extends "get",
        QueryShape extends {},
        ParamsShape extends {},
        BodyShape extends {},
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<
        {}
    >, BodyShape>;
        
                
            home(): TRequestExecutors<TResponseShape<
        {}
    >>;
        home<
        Method extends "get",
        QueryShape extends {},
        ParamsShape extends {},
        BodyShape extends {},
    >(data: {
        method?: Method;
        query?: QueryShape;
        params?: ParamsShape;
        body?: BodyShape;
    } & TRequestOptions): TRequestExecutors<TResponseShape<
        {}
    >, BodyShape>;
        }

export const apiModule = (sdk: any): IController$api => ({
    
    postman(data?: any) {
        return sdk.resolveResponse(async () => {
            sdk.checkPermission("api", "postman");

            const res = await sdk.client?.request({
                method: data?.method ?? "get" ?? "get",
                url: `/api/postman/${Object.values(data?.params ?? {}).join("/")}`,
                params: data?.query,
                data: data?.body,
                ...data?.axiosConfig,
            });

            if (!res) throw new Error(`Client not initialized!`, { cause: res });

            return res;
        });
    },
    
    test(data?: any) {
        return sdk.resolveResponse(async () => {
            sdk.checkPermission("api", "test");

            const res = await sdk.client?.request({
                method: data?.method ?? "get" ?? "get",
                url: `/api/test/${Object.values(data?.params ?? {}).join("/")}`,
                params: data?.query,
                data: data?.body,
                ...data?.axiosConfig,
            });

            if (!res) throw new Error(`Client not initialized!`, { cause: res });

            return res;
        });
    },
    
    home(data?: any) {
        return sdk.resolveResponse(async () => {
            sdk.checkPermission("api", "home");

            const res = await sdk.client?.request({
                method: data?.method ?? "get" ?? "get",
                url: `/api/${Object.values(data?.params ?? {}).join("/")}`,
                params: data?.query,
                data: data?.body,
                ...data?.axiosConfig,
            });

            if (!res) throw new Error(`Client not initialized!`, { cause: res });

            return res;
        });
    },
    
});