---
description: Learn about the major modules in the framework that makeup the whole app.
---

# Modules

The Epic API framework is built for flexibility and scalability, structured around five distinct module types. Each module is defined in its own file within a dedicated module folder, promoting clean organization and modular development. These modules can be independently created and later integrated to form a powerful, dynamic API.

The following is the list of modules that can be created in the Epic API framework:

1. **Controller**
2. **Model**
3. **Middleware**
4. **Hook**
5. **Job**

### Controller

A controller in the Epic API is a class enhanced with TypeScript decorators to add essential metadata. These decorators help establish a routing map by designating specific controller responsibilities. Controllers in Epic API manage endpoints, handling incoming requests and drafting responses delivered back to the client. Each controller is associated with a unique base URL within the route hierarchy. The routing mechanism efficiently determines the appropriate controller for each request.

#### Key Features

* **TypeScript Decorators**: Used to add necessary metadata to controllers and methods.
* **Method Decorators**: Convert class methods into accessible endpoints.
* **Routing Mechanism**: Maps requests to the correct controller based on

### Model

In the Epic API framework, a model represents a combination of a schema and a built-in MongoDB ODM, designed to facilitate seamless database interactions. The ODM's API closely resembles that of Mongoose, making it familiar for developers with prior experience. Models serve as the primary interface for working with MongoDB collections within the Epic API. When creating a new collection, a corresponding model is defined.

Epic API models offer strong TypeScript support, providing full type safety and autocompletion for all CRUD operations and database interactions.

### Middleware

In the Epic API framework, middleware functions act as modular units of logic that are executed during the request-response lifecycle. They can be used to handle tasks such as authentication, logging, validation, error handling, and more, before a request reaches the route handler or after a response is sent.

Middleware in Epic API is based on the Oak framework and follows a clean, composable structure, allowing developers to chain multiple middleware functions with ease. With full TypeScript support, middleware functions benefit from strong typing and enhanced developer experience, ensuring maintainable and predictable behavior across your application.

### Hook

Hooks in the Epic API framework provide a flexible way to extend request handling by allowing custom logic to run before or after a route’s handler. These are categorized into pre-hooks and post-hooks. Pre-hooks execute before the request handler and are commonly used for tasks like authentication, validation, or modifying request data. Post-hooks run after the handler completes and can be used for response formatting, logging, or caching. This structured approach enables developers to inject custom behavior at various stages of the request lifecycle, with full support for clean, maintainable code execution.

### Job

In the Epic API framework, jobs provide a mechanism for developers to register services, schedule recurring tasks, or perform global configurations across the application. They are designed to run at the application level, enabling centralized setup or background task execution that supports the overall functionality and scalability of the system.
