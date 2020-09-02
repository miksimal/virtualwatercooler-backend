import handler from "./libs/handler-lib";
import pair from "./libs/pair-lib";
import emailPairs from "./libs/emailPairs-lib";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const main = handler(async (event, context) => {
  const orgId = event.organisationId;
  const confirmed = "Confirmed";

  const queryParams = {
    ExpressionAttributeNames: { "#organisationId": "organisationId", "#status": "status" },
    ExpressionAttributeValues: { ':orgId': orgId, ':confirmed': confirmed },
    KeyConditionExpression: '#organisationId = :orgId',
    FilterExpression: '#status = :confirmed',
    TableName: process.env.USERS_TABLE,
  };
  let data;
  try {
    data = await dynamoDb.query(queryParams).promise();
  } catch(e) {
    throw e;
  }

  let pairs = pair(data);

  const organisationName = pairs[0][0].organisationName;
  const ses = new AWS.SES();
  const unsubscribeLink = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + "/unsubscribe";

  let promisesArray = emailPairs(pairs, ses, unsubscribeLink, organisationName);

  await Promise.all(promisesArray);
  return pairs;
});