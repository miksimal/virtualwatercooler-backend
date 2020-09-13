import AWS from "aws-sdk";
import handler from "./libs/handler-lib";
import pair from "./libs/pair-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const main = handler(async (event, context) => {
  const data = JSON.parse(event.body);
  const PK = "ORG#" + data.orgId;

  const params = {
    ExpressionAttributeNames: { "#PK": "PK", "#status": "status" },
    ExpressionAttributeValues: { ':PK': PK, ':active': "Active" },
    KeyConditionExpression: '#PK = :PK',
    FilterExpression: '#status = :active',
    TableName: process.env.MAIN_TABLE,
  };

  const response = await dynamoDb.query(params).promise();
  const pairs = pair(response.Items);
  return pairs;
});