// @deno-types=npm:@types/qs
import qs from "qs";

export const parseQueryParams = (str: string, opts?: qs.IParseOptions) =>
  qs.parse(str, { ignoreQueryPrefix: true, ...opts });
