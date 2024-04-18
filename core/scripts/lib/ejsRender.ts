// @deno-types="npm:@types/ejs"
import ejs from "ejs";
import { plural, singular } from "pluralize";
import {
  camelCase,
  paramCase,
  pascalCase,
  pathCase,
  snakeCase,
} from "stringcase/mod.ts";

export const ejsRender = (content: string, data?: ejs.Data) => {
  return ejs.render(content, {
    ...data,
    utils: {
      plural,
      singular,
      camelCase,
      paramCase,
      pascalCase,
      pathCase,
      snakeCase,
    },
  }, { async: true });
};
