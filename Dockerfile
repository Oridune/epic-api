FROM denoland/deno

EXPOSE 3742

WORKDIR /app

ADD . /app

RUN sed -i 's/\r$//' /app/run.sh

RUN chmod +x /app/run.sh

CMD ["bash", "/app/run.sh"]
