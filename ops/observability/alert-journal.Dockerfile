FROM node:24-slim
WORKDIR /app
COPY ops/observability/alert-journal.cjs ./alert-journal.cjs
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 9099
CMD ["node", "alert-journal.cjs"]
