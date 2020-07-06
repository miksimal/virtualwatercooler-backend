import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true
};

export async function main(event, context, callback) {
  const data = JSON.parse(event.body);
  const userId = data.userId;
  const orgId = data.orgId;

  // DynamoDB UpdateItem status of the user with this userId/orgId to Unsubscribed
  const params = {
    TableName: process.env.USERS_TABLE,
    UpdateExpression: "set #status = :unsubscribed",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":unsubscribed": "Unsubscribed"
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
      body: JSON.stringify(userId + "'s status was updated to 'Unsubscribed'")
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