import handler from "./libs/handler-lib";
import * as uuid from "uuid";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export const main = handler(async (event, context) => {
  const addUserDataArray = JSON.parse(event.body);

  const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;
  const parts = authProvider.split(':');
  const userPoolIdParts = parts[parts.length - 3].split('/');
  const userPoolUserId = parts[parts.length-1];
  const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];

  let orgId;
  let orgName;
  let adminName;

  var getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };
  try {
    let data = await cognitoidentityserviceprovider.adminGetUser(getUserParams).promise();
    adminName = data.UserAttributes.find(attr => attr.Name == 'name').Value;
    orgId = data.UserAttributes.find(attr => attr.Name == 'custom:organisationId').Value;
    orgName = data.UserAttributes.find(attr => attr.Name == 'custom:organisationName').Value; // would be better to get orgname from dynamo
  } catch(err) {
    throw err;
  }

  let existingEmails;

  try {
    const params = {
      ExpressionAttributeNames: { "#organisationId": "organisationId" },
      ExpressionAttributeValues: { ':orgId': orgId },
      KeyConditionExpression: '#organisationId = :orgId',
      ProjectionExpression: "email",
      TableName: process.env.USERS_TABLE,
    };
    let data = await dynamoDb.query(params).promise();
    existingEmails = data.Items.map(e => e.email);
  } catch(err) {
    throw err;
  }

  for (let user of addUserDataArray) {
    if (existingEmails.includes(user.email)) throw new Error("Email already exists: " + user.email);
  }

  let promisesArray = [];
  let userDetailsForEmails = [];
  let createdAt = Date.now();

  for (let user of addUserDataArray) {
    const params = {
      TableName: process.env.USERS_TABLE,
      Item: {
        organisationId: orgId,
        organisationName: orgName,
        userId: uuid.v1(), // generate outside of the params definition
        email: user.email,
        firstName: user.name,
        createdAt: createdAt,
        status: "Pending"
      }
    };
    userDetailsForEmails.push({userId: params.Item.userId, email: params.Item.email, firstName: params.Item.name}); // add token here
    promisesArray.push(dynamoDb.put(params).promise()); // change to transactwrites?
    // create second promisesarray for doing the TOKEN puts corresponding to each user
  }

  await Promise.all(promisesArray);

  const emailLambda = new AWS.Lambda({
    region: "eu-west-1"
  });
  const emailParams = {
    FunctionName: process.env.EMAIL_CONFIRM_LAMBDA,
    InvocationType: "Event",
    Payload: JSON.stringify({userArray: userDetailsForEmails, adminInfo: {orgName: orgName, orgId: orgId, adminName: adminName}})
  };

  emailLambda.invoke(emailParams).promise();

  return (promisesArray.length + " employees were added");
});