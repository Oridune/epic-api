FROM denoland/deno

EXPOSE 3742

WORKDIR /app

ADD . /app

RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
