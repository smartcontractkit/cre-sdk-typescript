import { prepareRuntime } from "@cre/sdk/utils/prepare-runtime";
import { sendResponseValue } from "@cre/sdk/utils/send-response-value";
import { sendErrorWrapped } from "@cre/sdk/testhelpers/send-error-wrapped";
import { SecretsError } from "@cre/sdk/utils/secrets-error";
import { errorBoundary } from "@cre/sdk/utils/error-boundary";
import { getSecret } from "@cre/sdk/utils/get-secret";
import { val } from "@cre/sdk/utils/values/value";

export async function main() {
  console.log(
    `TS workflow: standard test: secrets [${new Date().toISOString()}]`
  );

  prepareRuntime();
  versionV2();

  try {
    const secret = await getSecret("Foo");

    sendResponseValue(val.string(secret));
  } catch (e) {
    if (e instanceof SecretsError) {
      sendErrorWrapped(e.message);
    } else {
      errorBoundary(e);
    }
  }
}

main();
