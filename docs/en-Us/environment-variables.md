---
description: Setup environment variables on your project.
---

# Environment variables

When developing any application, it is an excellent practice to manage your environment variables professionally. Similarly, when working with Epic API, once you've cloned the repository, you must set up the environment variables before you start working!

Epic API supports 3 environment types **Development**, **Test,** and **Production**. You are required to execute the following command if the environment files don't already exist:

```bash
# Execute the built-in Deno task
deno task create:env -t development,test,production --randomString=123457890 --dbConnectionString="mongodb://localhost:27017/epic-api"
```

{% hint style="info" %}
**Note:** You can pass the environment variables directly in the command to auto-populate into the environment files. For example `--encryptionKey=123` or `--foo=bar`.
{% endhint %}

{% hint style="info" %}
You may notice a `.env` file created by default from the above command! This is a global variables file. These variables will be available in all environment types either development or production etc.
{% endhint %}

### Working with environment

Epic API framework exports a `Env` class that allows you to manage your environment configuration. See the following examples to understand how to use `Env` class.

#### How to get the current env type?

See the following code snippet, on how to get the current environment type in Epic API:

```typescript
import { Env } from "@Core/common/mod.ts";

console.log(Env.getType()); // Logs: development | production | test
```

#### How to check for a specific env type?

The following example shows you how to check for a specific environment type:

```typescript
import { Env, EnvType } from "@Core/common/mod.ts";

console.log(Env.is(EnvType.DEVELOPMENT)); // Logs: true | false
```

#### How to access environment variables?

The `Env` class provides various methods to access environment variables. Each method has a specific use case. See the following examples:

```typescript
import { Env } from "@Core/common/mod.ts";

// Sync access
Env.getSync("your-key"); // This method will either return a string or throw an error if undefined.
Env.getSync("your-key", true); // returns string | undefined
```

The `Env` class also provides an Async method to access environment variables. This method is the recommended method to use when working with Epic API because it provides backup access to the environment variables using a caching server like Redis or a database. See the following examples:

```typescript
import { Env } from "@Core/common/mod.ts";

// Sync access
await Env.get("your-key"); // This method will either return a string or throw an error if undefined.
await Env.get("your-key", true); // returns string | undefined
```

You can set a backup environment variable source as follows:

```typescript
import { Env } from "@Core/common/mod.ts";

Env.onGetFailed = async (key) => {
  const Value = await YourExternalSource.get(key) as string | null;
  return Value;
}
```

The `onGetFailed` method is called when an environment variable is not found by the `Env.get` method, in the local .env file. You can assign a custom function that fetches the environment variable from an external source.

{% hint style="info" %}
**Pro Tip:** You will have to use the [job module](overview/jobs.md) to assign a custom function for `onGetFailed` method.
{% endhint %}
