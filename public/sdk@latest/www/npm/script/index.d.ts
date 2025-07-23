/**
 * Copyright © Oridune 2025
 *
 * This is a generated file. Do not edit the contents of this file!
 */
import { AxiosInstance, AxiosResponse } from "axios";
import type { TSDKOptions, TCacheKey, TCacheOptions } from "./types.js";
import { oauthEntry } from "./extensions/oauth/entry.js";
export declare class EpicSDK {
    protected static _cachingAborts: Map<string, AbortController>;
    static _apiVersion: string;
    static _options?: TSDKOptions;
    static _axios?: AxiosInstance;
    static _useCachingMethods: Map<string, unknown>;
    static init(options?: TSDKOptions): void;
    static isPermitted: (scope: string, permission?: string) => boolean;
    static checkPermission(scope: string, permission?: string): void;
    static resolveCacheKey(keys: TCacheKey, namespace?: string): string;
    static setCache(keys: TCacheKey, value: any): Promise<boolean>;
    static getCache<T>(keys: TCacheKey): Promise<{
        value: T;
        timestamp: number;
    } | null>;
    static delCache(keys: TCacheKey): Promise<boolean>;
    static useCache<T>(callback: () => T | Promise<T>, options?: TCacheOptions<T>): Promise<T>;
    static useCaching<T>(cacheKey: TCacheKey, callback: (opts: {
        signal: AbortSignal;
    }) => T | Promise<T>, options?: Omit<TCacheOptions<T>, "cacheKey">, freshMethods?: boolean): {
        get: () => Promise<T>;
        del: () => Promise<boolean>;
        invalidate: () => Promise<T>;
        onInvalidate: (callback: (data: T) => void) => void;
        offInvalidate: (callback: (data: T) => void) => void;
    };
    static resolveAxiosResponse<T>(executor: () => Promise<AxiosResponse<T>>, options?: TCacheOptions<T>): {
        readonly raw: Promise<AxiosResponse<T, any>>;
        readonly res: Promise<T>;
        readonly data: Promise<unknown>;
    };
    static api: import("./modules/api.js").IController$api;
    static extensions: {
        oauth: typeof oauthEntry;
    };
}
//# sourceMappingURL=index.d.ts.map