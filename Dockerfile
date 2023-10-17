FROM denoland/deno

EXPOSE 3742

WORKDIR /app

ADD . /app

CMD ["deno", "task", "run"]
