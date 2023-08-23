---
description: Test your Epic API for a production ready app.
---

# Testing

Testing plays a crucial role in software development, a necessary step for deploying production applications. Epic API offers a convenient solution for testing applications through its integrated Deno testing libraries. By default, Epic API leverages the Oak framework for handling requests, and its testing capabilities are readily configured with the Superoak library.

Testing within Epic API is straightforward and allows flexibility in choosing your preferred testing framework. The framework has no restrictions, enabling you to substitute specific elements like the test runner seamlessly. Regardless of the chosen tools, you can still benefit from the pre-existing testing functionalities provided by the Epic API.

You can read more about testing in Deno [here](https://deno.com/manual/basics/testing).

You will be writing your tests under the `./tests/` folder at the root of your project. After writing your tests execute the following command:

```sh
# Execute the built-in Deno task to test your app
deno task test
```

{% hint style="info" %}
It is recommended to use the above command to run your tests, as this command is configured to run the tests in a limited scope. You can use the default `deno test` command to run your tests, but it may behave incorrectly in some cases.
{% endhint %}
