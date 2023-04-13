# epic-api

A simple and powerful api framework that allows you to build faster!

### Quick Start

```sh
# Clone the repository
git clone https://github.com/Oridune/epic-api.git my-new-app
```

### Environment variables are required

In order to run the following repository you need to make sure that the
directory where you cloned this repository contains the required environment
files. You need to create the following files:\
./env/.development.env\
./env/.production.env\
./env/.test.env

You can copy the initial environment variables content from ./.sample.env and
modify them.

### Execute the following commands to run the application on your local machine:

```sh
# For development server
deno task dev

# For production
deno task start

# For test
deno task test
```

### Always keep your application updated!

You should always keep your application updated in order to fix any possible
vulnerabilities or bugs. You can update the core of this application by running
the following command.

```sh
# Following command updates the core of the application and make sure that the application has the latest security patches.
deno task update:core
```
