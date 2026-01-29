import {
	cre,
	hostBindings,
	type HTTPPayload,
	Runner,
	type Runtime,
} from '@spaceandtime/cre-sdk'

type Config = {}

const onHttpTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
  const result = hostBindings.proofOfSqlVerify(payload.input.toString(), []);
  switch (result.verificationStatus) {
    case "Success":
      const blockNumberColumn = result.result.BLOCK_NUMBER;
      switch (blockNumberColumn.type){
        case "BigInt": 
          runtime.log(`Successfully retrieved data for block number: ${blockNumberColumn.column[0]}`)
          return "SQL Proof Verification Succeeded";
        default:
          runtime.log("BigInt Column BLOCK_NUMBER not found");
          return "Failure";
      }
      
    case "Failure":
      runtime.log("Verification failed")
      return "Failure";
  }
};

const initWorkflow = () => {
	const httpTrigger = new cre.capabilities.HTTPCapability()

	return [cre.handler(httpTrigger.trigger({}), onHttpTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>();
    await runner.run(initWorkflow);
}

main()
