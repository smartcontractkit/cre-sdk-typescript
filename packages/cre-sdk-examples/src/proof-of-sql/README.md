# Summary
This will be a brief tutorial explaining how to run proof of sql queries using CRE.
We will follow an example [http trigger workflow](./workflow) that is triggered using a [simple node project](./trigger).

# Step 1: Create the workflow
Create a Typescript workflow with an Http trigger following the [CRE docs](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/configuration-ts#configuration-and-handler).

Use the spaceandtime fork of the cre-sdk within `package.json`
```
"dependencies": {
    "@spaceandtime/cre-sdk": "^1.0.1"
},
```

Copy the following into main.ts:

```
import {cre, hostBindings, type HTTPPayload, Runner, type Runtime} from '@spaceandtime/cre-sdk'
type Config = {}

const onHTTPTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const result = hostBindings.proofOfSqlVerify(payload.input.toString(), []);
  if (result.verificationStatus == "Success") {
  	runtime.log(`Successfully retrieved data for block number: ${result.result.BLOCK_NUMBER.column[0]}`);
  }
  return result.verificationStatus
};

const initWorkflow = () => {
	const httpTrigger = new cre.capabilities.HTTPCapability()
	return [cre.handler(httpTrigger.trigger({}), onHTTPTrigger)]
}
export async function main() {
	const runner = await Runner.newRunner<Config>();
    await runner.run(initWorkflow);
}
main()
```

# Step 2: Acquire an SXT api key.
Create [here](https://app.spaceandtime.ai/settings/myPlan/apiAuthentication).

# Step 3: Create script to trigger the http trigger from off chain
Create a new node project:
```
npm init -y
```

Add the following package to the package.json:
```
"dependencies": {
    "@spaceandtime/sxt-proof-of-sql-sdk": "1.0.0"
}
```

Copy the following to `index.js`:
```
import {proofOfSqlQuery} from "@spaceandtime/ts-proof-of-sql-sdk";
const workflowUrl = "http://localhost:2000/trigger?workflowID=0xYOUR_WORKFLOW_ID";
const sxtApiKey = "YOUR_SXT_API_KEY";

async function main() {
    const result = await proofOfSqlQuery("select TIME_STAMP, BLOCK_NUMBER from ethereum.blocks limit 1", sxtApiKey);
    const response = await fetch(workflowUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"input": result})
    });
    console.log(response);
}
main();
```

We used CRE's cre-http-trigger package documented [here](https://docs.chain.link/cre/guides/workflow/using-triggers/http-trigger/local-testing-tool) in order to trigger the workflow.
