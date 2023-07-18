FROM denoland/deno

EXPOSE 3742

WORKDIR /app

ADD . /app

RUN deno cache ./serve.ts

CMD ["deno", "task", "start"]
