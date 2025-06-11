---
description: Models provide a systematic approach for interacting with databases.
---

# Models

By default, Epic API uses [MongoDB](https://www.mongodb.com/) with [Oridune Mongo ODM](https://deno.land/x/oridune_mongo), which serves as the default method for interacting with MongoDB, a popular NoSQL database.&#x20;

In this documentation, we will delve into the concept of models within Epic API, exploring their significance and how they streamline the interaction between the application and the MongoDB database. Understanding the fundamental principles of models will empower developers to design and implement robust and scalable database structures, ultimately enhancing their applications' overall functionality and performance.

{% hint style="info" %}
If you want to use a different database or ORM/ODM with Epic API, [consider reading this documentation](../examples/replace-mongodb-with-typeorm.md).
{% endhint %}

Creating a model in this framework is simple! Just execute the following command:

```bash
# Execute the built-in Deno task
deno task create:module -t model -n user --template blank.ts
```

{% hint style="info" %}
It is a good practice to use a singular model name like `-n user` in the above command because a model represents a single data entity.
{% endhint %}

It will generate the following model:

{% code title="models/user.ts" lineNumbers="true" %}
```typescript
import e, {
  // Following typescript utilities are used to infer the type of a validator schema. See the implementation below.
  type inferInput,
  type inferOutput,
} from "validator";
import {
  Mongo,
  ObjectId,
  
  // The following typescript utilities are used to extend any MongoDB's built-in fields like _id in the given type. It is used to convert a normal object type into a MongoDB document type. See the implementation below.
  type InputDocument,
  type OutputDocument
} from "mongo";

// Use Epic Validator to create a model schema
// We can use the InputUserSchema code below in other parts of our application!
// For example, if you want to write a create post endpoint in a posts controller, you don't need to write the body validator of the create endpoint! Instead, you can import this InputUserSchema validator in your controller and use it as a validator schema.
export const InputUserSchema = e.object({
  // Write your publicly exposable fields here
});

export const UserSchema = e.object({
  _id: e.optional(e.instanceOf(ObjectId, { instantiate: true })),
  createdAt: e.optional(e.date()).default(() => new Date()),
  updatedAt: e.optional(e.date()).default(() => new Date()),
  
  // Write your private or hidden fields here
})
// We have extended the InputUserSchema to the UserSchema to combine all fields into one schema
.extends(InputUserSchema);

// The following are the typescript utility types that can be used in any part of the application to infer the type of the above schema.
// Use the following type to infer the input data type of the schema, which will include the types of any optional fields. E.g. { foo?: string | undefined }
export type TUserInput = InputDocument<
  inferInput<typeof UserSchema>
>;

// Use the following type to infer the output data type of the schema, which will infer optional fields as required, but possibly undefined. E.g. { foo: string | undefined }
export type TUserOutput = OutputDocument<
  inferOutput<typeof UserSchema>
>;

export const UserModel = Mongo.model("user", UserSchema);

// Create a hook that updates the property `updatedAt` every time an update query is executed.
UserModel.pre("update", (details) => {
  details.updates.$set = {
    ...details.updates.$set,
    updatedAt: new Date(),
  };
});
```
{% endcode %}

Now you can import `UserModel` in your controllers and start interacting with the database. If you don't know how to use Oridune Mongo ODM, [read this](https://deno.land/x/oridune_mongo).

Use the following command to delete the model:

{% hint style="warning" %}
**Warning!** You cannot undo the following command, which can lead to a code deletion! Be careful when using this command.
{% endhint %}

```bash
# Execute the built-in Deno task
deno task delete:module -t model -n user.ts
```
