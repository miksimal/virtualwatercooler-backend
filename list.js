import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export function main(event, context, callback) {

  const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;
  const parts = authProvider.split(':');
  const userPoolIdParts = parts[parts.length - 3].split('/');
  const userPoolUserId = parts[parts.length-1];
  const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];

  let orgId;

  var getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };

  cognitoidentityserviceprovider.adminGetUser(getUserParams, function(err, data) {
    if (err) console.log(err, err.stack);
    else {
      orgId = data.UserAttributes.find(attr => attr.Name == 'custom:organisationId').Value;

      const params = {
        ExpressionAttributeNames: { "#organisationId": "organisationId"},
        ExpressionAttributeValues: { ':orgId': orgId },
        KeyConditionExpression: '#organisationId = :orgId',
        TableName: process.env.MAIN_TABLE,
      };

      dynamoDb.query(params, (error, data) => {
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
          body: JSON.stringify(data.Items)
        };
        callback(null, response);
      });
    }
  });
}