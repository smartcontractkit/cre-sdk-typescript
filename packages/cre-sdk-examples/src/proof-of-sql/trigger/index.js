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