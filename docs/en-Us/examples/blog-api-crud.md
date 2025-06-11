---
description: Implement a blog CRUD using Epic API.
---

# Blog API CRUD

This tutorial will guide you in creating a CRUD operation for a blog API. By the end of this article, you will have enhanced your understanding of API development using the Epic API framework. It will provide insights into best practices and effective coding structures for your projects.

We are going to create a CRUD operation that consists of a `posts` controller and a `post` model. The posts controller will have 4 different endpoints (createPost, getPosts, updatePost, deletePost).

Most of our jobs can be completed automatically by executing the relevant commands, as we learned earlier in this documentation.

### Start the development

We will execute the create command to auto-generate a model as follows:

```sh
# Execute the built-in Deno task
deno task create -t model -n post --template blank.ts
```

The above command will create a post.ts file in the models folder. The template code will look like the following:

