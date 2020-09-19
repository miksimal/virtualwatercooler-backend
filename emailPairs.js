import AWS from "aws-sdk";
import handler from "./libs/handler-lib";
import emailPairs from "./libs/emailPairs-lib";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

const validateMembersAndRetrieveOrgName = async (orgId, pairs, tableName) => {
  const PK = "ORG#" + orgId;
  const params = {
    ExpressionAttributeNames: { "#PK": "PK", "#status": "status", "#type": "type" },
    ExpressionAttributeValues: { ':PK': PK, ':active': "Active", ':organisation': "Organisation" },
    KeyConditionExpression: '#PK = :PK',
    FilterExpression: '#status = :active OR #type = :organisation',
    TableName: tableName,
  };

  let activeMembersAndOrg = await dynamoDb.query(params).promise();
  let orgName;
  const activeMemberEmails = [];
  for (let e of activeMembersAndOrg.Items) {
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
  const orgId = data.orgId;
  const unsubscribeLink = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + '/unsubscribe/' + orgId;

  const orgName = await validateMembersAndRetrieveOrgName(orgId, data.pairs, process.env.MAIN_TABLE);

  const promisesArray = emailPairs(data.pairs, ses, unsubscribeLink, orgName);

  await Promise.all(promisesArray);
});