"use strict";

// WIP
// Implement a server for persist-protobuf

const grpc = require("@grpc/grpc-js");
const loader = require("@grpc/proto-loader");
const path = require("path");
const PROTO_LOCATION = path.resolve(
  "./node_modules/persist-protobuf/service.proto",
);
const packageDefinition = loader.loadSync(PROTO_LOCATION, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const service = grpc.loadPackageDefinition(packageDefinition).serialize
  .SerializeService.service;
const server = new grpc.Server();
server.addService(service, {
  GetFormats(call, callback) {
    console.log("call", call);
    callback(null, {
      formats: [
        {
          id: "object-scraper",
        },
      ],
    });
  },
});

server.bindAsync(
  "localhost:50051",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error(err);
    } else {
      server.start();
      console.log(`Server started on port ${port}`);
    }
  },
);
