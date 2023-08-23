---
description: Extend the functionality of your applications using Epic API plugins.
---

# Plugins

Epic API revolutionizes the way developers build APIs by harnessing the power of a low-code architecture and employing a robust plugin system. With Epic API, developers can streamline their workflow, significantly reducing development time and effort while maintaining optimal flexibility and scalability. By providing a comprehensive set of tools and features.

Epic API empowers developers to create high-performance APIs with ease, enabling seamless integration, enhanced productivity, and accelerated application development. Whether you're a seasoned API developer or just starting your journey, Epic API empowers you to unlock the full potential of Deno.js and deliver exceptional, efficient, and reliable APIs.

In the context of Epic API, every project is treated as a plugin as long as it adheres to the specified plugin compatibility requirements. This concept closely resembles that of an npm module, where once installed, it seamlessly integrates and functions without any additional configuration.

#### Add Plugin:

```bash
# Execute the built-in Deno task
deno task add:plugin --source=git -n your-plugin-name
```

{% hint style="info" %}
**You might be thinking what's happening behind the scenes right?** Nothing fancy happens behind the scenes when you execute the above command, it simply clones a GIT repository into the `./plugins/` directory, removes useless files and folders from the cloned plugin and adds the plugin to the `.sequence.json` file.
{% endhint %}

{% hint style="info" %}
**Note:** By default, the Epic API framework uses GIT for downloading the plugins. If you don't pass `--source=git` It will still work.
{% endhint %}

#### Remove Plugin:

```bash
# Execute the built-in Deno task
deno task remove:plugin --source=git -n your-plugin-name
```

#### Update Plugin:

```bash
# Execute the built-in Deno task
deno task update:plugin --source=git -n your-plugin-name
```

{% hint style="info" %}
This command just executes the `remove:plugin` and `add:plugin` in a sequence to update the plugin! Nothing fancy happens in this command either.
{% endhint %}

## How to create a plugin?

If you want to create a plugin, just create a new Epic API project, see the [Get Started Page](../).

Once you've created a project, write your logic, test your code and publish it to [Github](https://github.com). That's all you need to do in order to create a plugin!

Now use the `add:plugin` command provided above to add your newly published plugin to any other Epic API project!

{% hint style="info" %}
**Note:** Currently Epic API doesn't support dependencies, so if you try to add a sub-plugin in a plugin and install it on a project, the sub-plugin will not work within that project!
{% endhint %}
