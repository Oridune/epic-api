/**
 * Copyright © Oridune 2024
 *
 * This is a generated file. Do not edit the contents of this file!
 */
import { AxiosInstance, AxiosResponse } from "axios";
import type { TSDKOptions, TAuthorization, TResponseShape } from "./types.ts";
export declare class EpicSDK {
    static options?: TSDKOptions;
    static client?: AxiosInstance;
    static auth?: TAuthorization;
    static permissions?: Set<string>;
    protected static generateRandomString(length: number): string;
    protected static generateCodeChallenge(): {
        verifier: string;
        method: string;
        challenge: string;
    };
    static init(options: TSDKOptions): void;
    static oauth2Login(appId: string, opts: {
        callbackUrl: string;
        theme?: "dark" | "light" | "system";
        lng?: string;
        username?: string;
        state?: Record<string, any>;
    }): {
        verifier: string;
        url: string;
    };
    static getAccessToken(code: string, verifier: string, opts: {
        deviceToken?: string;
    }): Promise<TAuthorization>;
    static refreshAccessToken(refreshToken: string): Promise<TAuthorization>;
    static isPermitted(scope: string, permission?: string): boolean;
    static checkPermission(scope: string, permission?: string): void;
    static resolveResponse<T>(executor: () => Promise<AxiosResponse>): {
        readonly raw: Promise<AxiosResponse<any, any>>;
        readonly res: Promise<TResponseShape<T>>;
        readonly data: Promise<T>;
    };
    static api: import("./modules/api.ts").IController$api;
}
