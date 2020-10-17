import AWS from "aws-sdk";
import handler from "./libs/handler-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const queueUrl = process.env.QUEUE_URL;
const sqs = new AWS.SQS();

const validateMembersAndRetrieveOrgName = async (orgId, pairs, tableName) => {
  const PK = "ORG#" + orgId;
  const params = {
    ExpressionAttributeNames: { "#PK": "PK", "#status": "status", "#type": "type" },
    ExpressionAttributeValues: { ':PK': PK, ':active': "Active", ':organisation': "Organisation" },
    KeyConditionExpression: '#PK = :PK',
    FilterExpression: '#status = :active OR #type = :organisation',
    TableName: tableName,
  };

  const activeMembersAndOrg = await dynamoDb.query(params).promise();
  let orgName;
  const activeMemberEmails = [];
  for (const e of activeMembersAndOrg.Items) {
    if (e.type === 'Organisation') {
      orgName = e.name;
    } else {
      activeMemberEmails.push(e.email);
    }
  }
  for (let pair of pairs) {
    if (!activeMemberEmails.includes(pair[0].email) || !activeMemberEmails.includes(pair[1].email)) {
      throw new Error("One or more members are no longer Active. Please re-generate pairs and try again.");
    }
  }
  return orgName;
};

export const main = handler(async (event, context) => {
  const data = JSON.parse(event.body);

  const orgName = await validateMembersAndRetrieveOrgName(data.orgId, data.pairs, process.env.MAIN_TABLE);

  const sqsParams = {
    MessageBody: JSON.stringify({pairs: data.pairs, orgId: data.orgId, orgName: orgName}),
    QueueUrl: queueUrl
  };

  await sqs.sendMessage(sqsParams).promise();
});