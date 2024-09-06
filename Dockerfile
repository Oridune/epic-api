FROM denoland/deno

EXPOSE 3742

WORKDIR /app

ADD . /app

RUN chmod +x /app/run.sh

CMD ["/app/run.sh"]
