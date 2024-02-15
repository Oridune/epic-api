---
description: Setup your first Epic API project.
---

# Getting started

## Introduction

Epic API (epic-api) is a robust framework for developing efficient and scalable [Deno.js](https://deno.com/runtime) APIs. It leverages the powerful Oak framework to handle API requests seamlessly. The primary objective behind creating this framework is to enhance the developer experience by automating a significant portion of the coding process and reducing the need for rewriting or managing boilerplate code. Throughout its development, utmost consideration has been given to industry best practices.

### Requirements

Epic API framework runs on the Deno.js runtime. You are required to have Deno.js installed on your machine to start working. [See how to install Deno.js](https://deno.com/manual/getting\_started/installation)

### Manual Installation

To get started with manual installation, Simply clone the Epic API repository from GitHub onto your local machine and initiate your work promptly.

```bash
# Clone the repository
git clone -b default-v1 https://github.com/Oridune/epic-api.git my-new-app

# Initialize Project
deno task init
```

{% hint style="danger" %}
**Remember!**\
The command `deno task init` is just used to initialize a newly created project. You should not use this command again if you've already executed it because it deletes the previous `.git` folder and reinitializes the git.
{% endhint %}

Once you have set everything correctly, run the following command to start the API server:

```bash
# Execute the built-in Deno task
deno task dev
```

{% hint style="warning" %}
**Unable to start the development server?**

If you are using this framework for the first time, it is possible that you don't have Denon installed on your machine! [Install Denon](https://deno.land/x/denon) and try the above command again.
{% endhint %}

Once the development server starts listening, open your browser or Postman and send a request to [http://localhost:3742](http://localhost:3742).
