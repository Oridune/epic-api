import { expandGlob } from "fs";

for await (const Entry of expandGlob("*.*", {
  globstar: true,
}))
  console.log(Entry);
