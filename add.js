import * as uuid from "uuid";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export async function main(event, context, callback) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  };

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
    orgName = data.UserAttributes.find(attr => attr.Name == 'custom:organisationName').Value;
  } catch(err) {
    console.log(err, err.stack);
    const response = {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ status: false })
    };
    callback(null, response);
    return;
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
        userId: uuid.v1(),
        email: user.email,
        firstName: user.name,
        createdAt: createdAt,
        status: "Pending"
      }
    };
    userDetailsForEmails.push({userId: params.Item.userId, email: params.Item.email, firstName: params.Item.name});
    promisesArray.push(dynamoDb.put(params).promise());
  }

  try {
    await Promise.all(promisesArray);

    const emailLambda = new AWS.Lambda({
      // TODO (a) is region needed? if so, (b) take region from env var
      region: "eu-west-1"
    });

    const emailParams = {
      // TODO service and environment name properly take from env var here
      FunctionName: process.env.EMAIL_CONFIRM_LAMBDA,
      InvocationType: "Event",
      Payload: JSON.stringify({userArray: userDetailsForEmails, adminInfo: {orgName: orgName, orgId: orgId, adminName: adminName}})
    };

    console.log(emailParams.Payload);

    // this did not work: emailLambda.invoke(emailParams);
    emailLambda.invoke(emailParams).promise();

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(promisesArray.length + " employees were added")
    };
    callback(null, response);
  } catch(err) {
      console.log(err);
      const response = {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ status: false })
      };
      callback(null, response);
  }
}