---
description: Learn how the internals of Epic API works.
---

# Architecture

Understanding the inner mechanics of the development framework you engage with holds paramount significance. By delving into its core functionalities, you gain mastery over its tools and optimize your coding practices. This knowledge enables you to troubleshoot effectively, innovate confidently, and build solutions that harness the framework's full potential. In essence, unravelling the framework's intricacies empowers you to craft robust and efficient applications.

Epic API is a Deno framework that is built on top of the Oak framework, extending the power of the Oak framework while keeping simplicity and performance. It is important for you to understand the internal workings of the Epic API framework so that you can master it.

The following diagram shows the lifecycle of an Epic API, loading and registering modules, connecting to the database, executing the jobs and listening to the HTTP requests etc:

<figure><img src=".gitbook/assets/epic-api.app-lifecycle.png" alt=""><figcaption><p>Epic API Lifecycle</p></figcaption></figure>

Once an Epic API server spins up, the server starts listening to the HTTP requests from the clients. See the following diagram for understanding the request-response lifecycle:

<figure><img src=".gitbook/assets/epic-api.request-lifecycle.png" alt=""><figcaption><p>Epic API's Request-Response Lifecycle</p></figcaption></figure>
