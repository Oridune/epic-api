import { parse } from "flags";
import e from "validator";

import { ApiServer } from "@Core/common/mod.ts";
import { APIController } from "@Core/controller.ts";

export const syncPostman = async (options: {
  key: string;
  collectionId: string;
}) => {
//   const Options = await e
//     .object({
//       key: e.string(),
//       collectionId: e.string(),
//     })
//     .validate(options);

  await new ApiServer(APIController).prepare((routes, options) => {
    console.log(routes, options);
  });
};

if (import.meta.main) {
  const { key, k, collectionId, c } = parse(Deno.args);

  syncPostman({
    key: key ?? k,
    collectionId: collectionId ?? c,
  });
}
