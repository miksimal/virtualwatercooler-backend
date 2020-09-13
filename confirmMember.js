import AWS from "aws-sdk";
import handler from "./libs/handler-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.MAIN_TABLE;

export const main = handler(async (event, context) => {
  const data = JSON.parse(event.body);
  const token = "CONFIRMTOKEN#" + data.tokenId;
  const SK = "MEMBER#" + data.email;
  const PK = "ORG#" + data.orgId;

  const tokenParams = {
    TableName: tableName,
    Key: {
      PK: token,
      SK: SK
    },
    ConditionExpression: "attribute_exists(PK)",
  };

  const memberParams = {
    ExpressionAttributeNames: { "#status": "status"},
    ExpressionAttributeValues: { ":active": "Active"},
    TableName: tableName,
    Key: {
      PK: PK,
      SK: SK
    },
    ConditionExpression: "attribute_exists(PK)",
    UpdateExpression: "set #status = :active"
  };

  const params = {TransactItems: [{Delete: tokenParams}, {Update: memberParams}]};

  await dynamoDb.transactWrite(params).promise();
  return (data.email + "'s status was updated to 'Active'");
});