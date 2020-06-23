import * as uuid from "uuid";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export function main(event, context, callback) {
  const addUserData = JSON.parse(event.body);

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
  cognitoidentityserviceprovider.adminGetUser(getUserParams, function(err, data) {
    if (err) console.log(err, err.stack);
    else {
      orgId = data.UserAttributes.filter(function(attribute) { return attribute.Name === 'custom:organisationId'; })[0].Value;
      orgName = data.UserAttributes.filter(function(attribute) { return attribute.Name === 'custom:organisationName'; })[0].Value;

      const params = {
        TableName: process.env.USERS_TABLE,
        Item: {
          organisationId: orgId,
          organisationName: orgName,
          userId: uuid.v1(),
          email: addUserData.email,
          firstName: addUserData.firstName,
          createdAt: Date.now()
        }
      };

      console.log(JSON.stringify(params.Item, null, 2));

      dynamoDb.put(params, (error) => {
        // Set response headers to enable CORS (Cross-Origin Resource Sharing)
        const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true
        };

        // Return status code 500 on error
        if (error) {
          const response = {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ status: false })
          };
          callback(null, response);
          return;
        }

        // Return status code 200 and the newly created item
        const response = {
          statusCode: 200,
          headers: headers,
          body: JSON.stringify(params.Item)
        };
        callback(null, response);
      });
    }
  });
}