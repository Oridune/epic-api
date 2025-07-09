import type { AxiosRequestConfig, AxiosResponse, CreateAxiosDefaults } from "axios";

export type ObjectId = string;

export type TCacheSetter = (key: string, value: string) => boolean | Promise<boolean>;
export type TCacheGetter = (key: string) => string | undefined | Promise<string | undefined>;
export type TCacheDelete = (key: string) => boolean | Promise<boolean>;

export type TSDKOptions = {
    axiosConfig?: CreateAxiosDefaults,
    cache?: {
        setter: TCacheSetter,
        getter: TCacheGetter,
        delete: TCacheDelete,
    },
};

export type TCacheKey = string | string[];

export type TCacheOptions<T> = {
    cacheKey?: TCacheKey;
    cacheTTL?: number | ((data: T, timestamp: number) => number);
};

export type TRequestOptions<T> = {
    axiosConfig?: Omit<
        AxiosRequestConfig<unknown>,
        "method" | "url" | "data" | "params"
    >;
    signal?: AbortSignal
} & TCacheOptions<T>;

export type TResponseShape<D> = {
    status: boolean;
    data?: D;
    messages?: Array<Partial<
        { message: string, location: string }
    >>
};

export type TRequestExecutors<R extends TResponseShape<any>, B = any> = {
    raw: Promise<AxiosResponse<R, B>>;
    res: Promise<R>;
    data: Promise<R["data"]>;
}