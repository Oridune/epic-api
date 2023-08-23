---
description: Setup environment variables on your project.
---

# Environment Variables

When developing any application, it is an excellent practice to manage your environment variables in a professional manner. Similarly, when working with Epic API, once you've cloned the repository, you must set up the environment variables before you start working!

Epic API supports 3 environment types **Development**, **Test,** and **Production**. You are required to execute the following command if the environment files don't already exist:

```bash
# Execute the built-in Deno task
deno task create:env -t development,test,production --encryptionKey=123457890 --dbConnectionString="mongodb://localhost:27017/epic-api"Note: You can pass the environment variables directly in the command to auto populate into the environment files for example --encryptionKey=123 or --foo=bar.
```

{% hint style="info" %}
**Note:** You can pass the environment variables directly in the command to auto-populate into the environment files. For example `--encryptionKey=123` or `--foo=bar`.
{% endhint %}

{% hint style="info" %}
You may notice a `.env` file created by default from the above command! This is a global variables file. These variables will be available in all environment types either development or production etc.
{% endhint %}
