import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export async function main(event, context, callback) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  };
  const data = JSON.parse(event.body);
  const userId = data.userId;
  const orgId = data.orgId;

  // DynamoDB UpdateItem status of the user with this userId/orgId to Confirmed (default is Pending)
  const params = {
    TableName: process.env.USERS_TABLE,
    UpdateExpression: "set #status = :confirmed",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":confirmed": "Confirmed"
    },
    Key: {
      "organisationId": orgId,
      "userId": userId,
    }
  };

  try {
    await dynamoDb.update(params).promise();

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(userId + "'s status was updated to 'Confirmed'")
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