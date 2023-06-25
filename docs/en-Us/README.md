---
description: Setup your first Epic API project.
---

# Getting started

## Introduction

Epic API (epic-api) is a robust framework for developing efficient and scalable [Deno.js](https://deno.com/runtime) APIs. It leverages the powerful Oak framework to handle API requests seamlessly. The primary objective behind creating this framework is to enhance the developer experience by automating a significant portion of the coding process and reducing the need for rewriting or managing boilerplate code. Throughout its development, utmost consideration has been given to industry best practices.

### Requirements

Epic API framework runs on the Deno.js runtime. You are required to have Deno.js installed on your machine in order to start working. [See how to install Deno.js](https://deno.com/manual/getting\_started/installation)

### Installation

To get started, there is no requirement for CLI installation. Simply clone the Epic API repository from GitHub onto your local machine and initiate your work promptly.

```bash
# Clone the repository
git clone https://github.com/Oridune/epic-api.git my-new-app
```

### Environment Variables

When developing any kind of application, it is a good practice to manage your environment variables in a professional manner. Similarly when working with Epic API, once you've cloned the repository, You are required to setup the environment variables first before you start working!

Epic API supports 3 environment types **Development**, **Test** and **Production**. You are required to execute the following command if the environment files doesn't already exist:

```bash
# Execute the built-in Deno task
deno task create:env -t development,test,production --encryptionKey=123457890 --dbConnectionString="mongodb://localhost:27017/epic-api"Note: You can pass the environment variables directly in the command to auto populate into the environment files for example --encryptionKey=123 or --foo=bar.
```

{% hint style="info" %}
**Note:** You can pass the environment variables directly in the command to auto populate into the environment files for example `--encryptionKey=123` or `--foo=bar`.
{% endhint %}

Once you have setup everything correctly, run the following command to start the API server:

```bash
# Execute the built-in Deno task
deno task dev
```

Open your browser and navigate to [http://localhost:3742](http://localhost:3742).

