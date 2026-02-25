import { T as TSS_SERVER_FUNCTION, a as getServerFnById, c as createServerFn } from "../server.js";
const createSsrRpc = (functionId, importer) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    const serverFn = await getServerFnById(functionId);
    return serverFn(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getAuthToken = createServerFn({
  method: "GET"
}).handler(createSsrRpc("338fa27ae3120c7fe66337d2fae279a327ce8fd59d688bf62b75de6ad23e48c2"));
createServerFn({
  method: "GET"
}).handler(createSsrRpc("988f932a00c333c6bb8e7100cd237c222e46cb103f32a16ff656c65e637f9308"));
const isAuthenticated = createServerFn({
  method: "GET"
}).handler(createSsrRpc("a3fe213e5275d66396225ebc27bc3c6146678f5a2b3bd9e366a35a4c260ab1c1"));
const login = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("aceb4afc59163ecc33d059aa019da606105f8d4c88dc43f0d6b58389b410b7a8"));
const loginWithTwoFactor = createServerFn({
  method: "POST"
}).inputValidator((data) => data).handler(createSsrRpc("e7425d8a87ce7784e974ad7333aebdfd2a4903dbe9ee1ee190edb6420088c802"));
const logout = createServerFn({
  method: "POST"
}).handler(createSsrRpc("ea03da1fb8c22df1fb3d0dbe331c56db03b76d0fffef9c546bfb779df08466ce"));
export {
  login as a,
  loginWithTwoFactor as b,
  createSsrRpc as c,
  getAuthToken as g,
  isAuthenticated as i,
  logout as l
};
