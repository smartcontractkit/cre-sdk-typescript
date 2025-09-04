import { doGetSecret } from "@cre/sdk/utils/secrets/do-get-secret";
import { awaitAsyncSecret } from "@cre/sdk/utils/secrets/await-async-secret";
import { LazyPromise } from "@cre/sdk/utils/lazy-promise";

export const getSecret = (id: string): Promise<any> => {
  const callbackId = doGetSecret(id);
  return new LazyPromise(async () => awaitAsyncSecret(callbackId));
};
