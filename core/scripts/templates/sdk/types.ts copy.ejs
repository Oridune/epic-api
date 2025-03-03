import type { AxiosRequestConfig, AxiosResponse, CreateAxiosDefaults } from "axios";

export type ObjectId = string;

export type TSDKOptions = CreateAxiosDefaults;
export type TRequestOptions = {
    axiosConfig?: Omit<
        AxiosRequestConfig<unknown>,
        "method" | "url" | "data" | "params"
    >;
};

export type TResponseShape<D> = {
    status: boolean;
    data: D;
    messages?: Array<{ message: string, location?: string }>
};

export type TRequestExecutors<R extends TResponseShape<any>, B = any> = {
    raw: Promise<AxiosResponse<R, B>>;
    res: Promise<R>;
    data: Promise<R["data"]>;
}

export type TAuthToken<T extends "oauth_refresh_token" | "oauth_access_token"> = {
    issuer: string;
    type: T;
    token: string;
    expiresAtSeconds: number;
};

export type TAuthorization = {
    refresh: TAuthToken<"oauth_refresh_token">;
    access: TAuthToken<"oauth_access_token">;
};