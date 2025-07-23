export const apiModule = (sdk) => ({
    memoryUsage(data) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios)
                throw new Error("Axios not initialized!");
            sdk.checkPermission("api", "memoryUsage");
            const url = Object.entries(data?.params ?? {}).reduce((endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value), "/api/memory/usage").replace(/:\w+\?\/?/g, "");
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
    postman(data) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios)
                throw new Error("Axios not initialized!");
            sdk.checkPermission("api", "postman");
            const url = Object.entries(data?.params ?? {}).reduce((endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value), "/api/postman").replace(/:\w+\?\/?/g, "");
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
    test(data) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios)
                throw new Error("Axios not initialized!");
            sdk.checkPermission("api", "test");
            const url = Object.entries(data?.params ?? {}).reduce((endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value), "/api/test").replace(/:\w+\?\/?/g, "");
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
    home(data) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios)
                throw new Error("Axios not initialized!");
            sdk.checkPermission("api", "home");
            const url = Object.entries(data?.params ?? {}).reduce((endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value), "/api").replace(/:\w+\?\/?/g, "");
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
    heapSnapshot(data) {
        return sdk.resolveAxiosResponse(async () => {
            if (!sdk._axios)
                throw new Error("Axios not initialized!");
            sdk.checkPermission("api", "heapSnapshot");
            const url = Object.entries(data?.params ?? {}).reduce((endpoint, [key, value]) => endpoint.replace(new RegExp(`:${key}\\??`, "g"), value), "/api/heap/snapshot/:filename?").replace(/:\w+\?\/?/g, "");
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
