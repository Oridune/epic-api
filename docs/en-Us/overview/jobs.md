---
description: Execute a specific job (task) when your application starts.
---

# Jobs

In Epic API, jobs allow developers to register various services, schedule tasks, or modify server instances on a global level of the application.

You can execute the following command to create a job:

```bash
# Execute the built-in Deno task
deno task create:module -t job -n createDefaultUser --template blank.ts
```

This command is going to generate the following code:

{% code title="jobs/createDefaultUser.ts" lineNumbers="true" %}
```typescript
import { Application } from "oak";

export default async (app: Application) => {
  // Write the logic to execute on app start (before server starts listening)...

  return async () => {
    // This code executes when the app receives "SIGINT" | "SIGTERM" | "SIGBREAK" signal.
    // Your optional cleanup code here...
  };
};

```
{% endcode %}

Use the following command to delete the job:

{% hint style="warning" %}
**Warning!** You cannot undo the following command, which can lead to a code deletion! Be careful when using this command.
{% endhint %}

```bash
# Execute the built-in Deno task
deno task delete:module -t job -n createDefaultUser.ts
```
