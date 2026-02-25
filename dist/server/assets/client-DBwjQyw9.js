import { T as TSS_SERVER_FUNCTION } from "../server.js";
import { GraphQLClient } from "graphql-request";
const createServerRpc = (serverFnMeta, splitImportFn) => {
  const url = "/_serverFn/" + serverFnMeta.id;
  return Object.assign(splitImportFn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const GRAPHQL_API_URL = process.env.NEXT_PUBLIC_SORARE_API_URL || "https://api.sorare.com/federation/graphql";
const JWT_AUD = process.env.JWT_AUD || "sorare-ai";
const createGraphQLClient = (token) => {
  const headers = {
    "JWT-AUD": JWT_AUD
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return new GraphQLClient(GRAPHQL_API_URL, {
    headers
  });
};
createGraphQLClient();
export {
  createGraphQLClient as a,
  createServerRpc as c
};
