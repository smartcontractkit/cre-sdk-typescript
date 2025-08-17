import { doGetSecret } from "@cre/sdk/testhelpers/do-get-secret";
import { awaitAsyncSecret } from "@cre/sdk/testhelpers/await-async-secret";
import { LazyPromise } from "@cre/sdk/utils/lazy-promise";

export const getSecret = (id: string): Promise<any> => {
  const callbackId = doGetSecret("Foo");
  return new LazyPromise(async () => awaitAsyncSecret(callbackId));
};
