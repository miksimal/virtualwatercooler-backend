import handler from "./libs/handler-lib";
import pair from "./libs/pair-lib";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.MAIN_TABLE;
const queueUrl = process.env.QUEUE_URL;
const sqs = new AWS.SQS();

export const main = handler(async (event, context) => {
  const orgId = event.organisationId;

  const PK = "ORG#" + orgId;
  const params = {
    ExpressionAttributeNames: { "#PK": "PK", "#status": "status", "#type": "type" },
    ExpressionAttributeValues: { ':PK': PK, ':active': "Active", ':organisation': "Organisation" },
    KeyConditionExpression: '#PK = :PK',
    FilterExpression: '#status = :active OR #type = :organisation',
    TableName: tableName,
  };

  const activeMembersAndOrg = await dynamoDb.query(params).promise();
  const activeMembers = [];
  let orgName;
  for (let e of activeMembersAndOrg.Items) {
    if (e.type === 'Organisation') {
      orgName = e.name;
    } else {
      activeMembers.push(e);
    }
  }

  if (activeMembers.length < 2) throw new Error('Recurring email for ' + orgName + ' not sent - fewer than 2 active members');

  const pairs = pair(activeMembers);

  const sqsParams = {
    MessageBody: JSON.stringify({pairs: pairs, orgId: orgId, orgName: orgName}),
    QueueUrl: queueUrl
  };
  await sqs.sendMessage(sqsParams).promise();
});