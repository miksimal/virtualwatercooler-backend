import AWS from "aws-sdk";
import pair from "./libs/pair-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export function main(event, context, callback) {
  const data = JSON.parse(event.body);
  const orgId = data.orgId;
  const confirmed = "Confirmed";

  const params = {
    ExpressionAttributeNames: { "#organisationId": "organisationId", "#status": "status" },
    ExpressionAttributeValues: { ':orgId': orgId, ':confirmed': confirmed },
    KeyConditionExpression: '#organisationId = :orgId',
    FilterExpression: '#status = :confirmed',
    TableName: process.env.USERS_TABLE,
  };

  dynamoDb.query(params, (error, data) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    };

    if (error) {
      const response = {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ status: false })
      };
      callback(null, response);
      return;
    }

    let pairs = pair(data);

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(pairs)
    };
    callback(null, response);
  });
}