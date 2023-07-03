---
description: Models provide a systematic approach for interacting with databases.
---

# Models

By default, Epic API uses [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/), which serves as the default method for interacting with MongoDB, a popular NoSQL database.&#x20;

In this documentation, we will delve into the concept of models within Epic API, exploring their significance and how they streamline the interaction between the application and the MongoDB database. Understanding the fundamental principles of models will empower developers to design and implement robust and scalable database structures, ultimately enhancing their applications' overall functionality and performance.

{% hint style="info" %}
If you want to use a different database with Epic API, [consider reading this documentation](../examples/replace-mongodb-with-typeorm.md).
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
import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new mongoose.Schema<IUser>(
  {},
  { timestamps: true, versionKey: false }
);

export const UserModel = mongoose.model<IUser>(
  "user",
  UserSchema
);

```
{% endcode %}

Now you can import `UserModel` in your controllers and start interacting with the database. If you don't know how to use Mongoose ODM, [read this](https://mongoosejs.com/docs/).

Use the following command to delete the model:

{% hint style="warning" %}
**Warning!** You cannot undo the following command, which can lead to a code deletion! Be careful when using this command.
{% endhint %}

```bash
# Execute the built-in Deno task
deno task delete:module -t model -n user.ts
```
