# epic-api

A powerful express based api framework.

### Environment variables are required

In order to run the following repository you need to make sure that the
directory where you cloned this repository contains the required environment
files. You need to create the following files:\
./env/.development.env\
./env/.production.env\
./env/.test.env\
You can copy the initial environment variables content from ./.sample.env and
modify them.

### Execute the following commands to run the application on your local machine:

```sh
# Make sure you have the Epic CLI installed on your machine before you run the app or Install the CLI with the following command.
npm i -g @oridune/epic

# Or you can also update the CLI if it is already installed on your machine.
epic update

# For development server
epic build && npm run dev

# For production
epic build && npm start
```

### Always keep your application updated!

You should always keep your application updated in order to fix any possible
vulnerabilities or bugs. You can update the core of this application by running
the following command.

```sh
# Following command updates the core of the application and make sure that the application has the latest security patches.
epic upgrade-api
```
