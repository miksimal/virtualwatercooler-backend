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

  var getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };
  try {
    let data = await cognitoidentityserviceprovider.adminGetUser(getUserParams).promise();
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
  let createdAt = Date.now();

  for (let user of addUserDataArray) {
    const params = {
      TableName: process.env.USERS_TABLE,
      Item: {
        organisationId: orgId,
        organisationName: orgName,
        userId: uuid.v1(),
        email: user.email,
        firstName: user.firstName,
        createdAt: createdAt
      }
    };
    promisesArray.push(dynamoDb.put(params).promise());
  }

  try {
    await Promise.all(promisesArray);
    // Return status code 200 and the newly created item
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