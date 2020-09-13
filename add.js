import handler from "./libs/handler-lib";
import getCallerInfo from "./libs/getCallerInfo-lib";
import * as uuid from "uuid";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
const tableName = process.env.MAIN_TABLE;
const emailLambdaName = process.env.EMAIL_CONFIRM_LAMBDA;

const checkForDuplicates = async (orgId, tableName, addMemberDataArray) => {
  let existingEmails;

  try {
    const PK = "ORG#" + orgId;
    const SKBeginsWith = "MEMBER";
    const params = {
      ExpressionAttributeNames: { "#PK": "PK", "#SK": "SK"},
      ExpressionAttributeValues: { ':PK': PK, ':member': SKBeginsWith },
      KeyConditionExpression: '#PK = :PK AND begins_with(#SK, :member)',
      ProjectionExpression: "email",
      TableName: tableName,
    };
    const data = await dynamoDb.query(params).promise();
    existingEmails = data.Items.map(e => e.email);
  } catch(err) {
    throw err;
  }

  const duplicates = [];

  for (let member of addMemberDataArray) {
    if (existingEmails.includes(member.email)) duplicates.push(member.email);
  }

  if (duplicates.length !== 0) throw new Error("Email(s) already exist: " + duplicates.join(", "));
};

export const main = handler(async (event, context) => {
  const addMemberDataArray = JSON.parse(event.body);
  // TODO do I need to validate that the request data doesnt contain duplicates or does json-schema do that?
  const callerInfo = await getCallerInfo(event, cognitoidentityserviceprovider);
  const orgId = callerInfo.orgId;
  const adminName = callerInfo.adminName;
  const orgName = callerInfo.orgName;

  await checkForDuplicates(orgId, tableName, addMemberDataArray);

  const promisesArray = [];
  const memberDetailsForEmails = [];

  for (let member of addMemberDataArray) {
    const memberSortKey = "MEMBER#" + member.email;
    const memberParams = {
      TableName: tableName,
      Item: {
        PK: "ORG#" + orgId,
        SK: memberSortKey,
        email: member.email,
        name: member.name,
        status: "Pending",
        type: "Member"
      }
    };
    const tokenId = uuid.v1();
    const token = "CONFIRMTOKEN#" + tokenId;
    const tokenParams = {
      TableName: tableName,
      Item: {
        PK: token,
        SK: memberSortKey,
        type: "Token"
      }
    };
    const params = {TransactItems: [{Put: memberParams}, {Put: tokenParams}]};

    promisesArray.push(dynamoDb.transactWrite(params).promise());
    memberDetailsForEmails.push({email: memberParams.Item.email, name: memberParams.Item.name, tokenId: tokenId});
  }

  const results = await Promise.allSettled(promisesArray);

  const failedAdds = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      failedAdds.push(addMemberDataArray[i].email);
      memberDetailsForEmails.splice(i, 1);
    }
  }

  if (memberDetailsForEmails.length === 0) {
    throw new Error("Failed to add any of the members because: " + failedAdds[0].reason);
  }

  const emailLambda = new AWS.Lambda({
    region: "eu-west-1"
  });
  const emailParams = {
    FunctionName: emailLambdaName,
    InvocationType: "Event",
    Payload: JSON.stringify({memberArray: memberDetailsForEmails, adminInfo: {orgId: orgId, orgName: orgName, adminName: adminName}})
  };

  try {
    await emailLambda.invoke(emailParams).promise();
  } catch (err) {
    throw err;
  }

  if (failedAdds.length > 0) {
    return (memberDetailsForEmails.length + " members were added. The following members were not added: " + failedAdds.join(", "));
  } else return (memberDetailsForEmails.length + " members were added");
});