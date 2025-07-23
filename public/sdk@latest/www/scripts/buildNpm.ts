
    import { build, emptyDir } from "jsr:@deno/dnt";

    await emptyDir("./npm");

    await build({
      entryPoints: ["./index.ts"],
      outDir: "./npm",
      shims: {
        // see JS docs for overview and more options
        deno: true,
      },
      package: {"name":"epic-api-sdk","version":"0.0.0","private":true,"main":"./dist/index.js","scripts":{"build":"tsc"},"author":"Epic API","license":"MIT","homepage":"https://oridune.com"},
    });
    