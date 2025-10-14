# CRE HTTP Trigger Proxy

Utility app that allows for easy triggering of workflows via HTTP.

## Setup

First you need to prepare your environment variables. You can do this by copying the `.env.example` file to `.env` and filling in the values.

`PRIVATE_KEY=0x...` - This is the private key corresponding with your workflow `authorizedKeys`.
`GATEWAY_URL=http://localhost:5002/user` - This is the URL of the gateway you are using. You can use https:// and point to the published gateway.

Next you would need to install the dependencies, for that run: `bun install`.

Next you would need to run the app with `bun start`. This will spin tiny http server, that would validate the env variables and will prepare the request that will trigger the workflow. Basically it's your **proxy** now.

## Usage

You can use postman or any other http client to send a request.

```http
POST http://localhost:3000/trigger?workflowID=0xYourWorkflowID
Content-Type: application/json

{
  "input": {
    "anyInput": "your workflow expects"
  }
}
```
