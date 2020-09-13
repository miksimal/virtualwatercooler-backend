import AWS from "aws-sdk";
import handler from "./libs/handler-lib";
import getCallerInfo from "./libs/getCallerInfo-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export const main = handler(async (event, context) => {

  const callerInfo = await getCallerInfo(event, cognitoidentityserviceprovider);
  const PK = "ORG#" + callerInfo.orgId;

  const params = {
    ExpressionAttributeNames: { "#PK": "PK"},
    ExpressionAttributeValues: { ':PK': PK },
    KeyConditionExpression: '#PK = :PK',
    TableName: process.env.MAIN_TABLE,
  };

  try {
    const data = await dynamoDb.query(params).promise();
    return data.Items;
  } catch (err) {
    throw err;
  }
});