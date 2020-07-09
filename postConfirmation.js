import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export function main(event, context, callback) {
  const params = {
    TableName: process.env.USERS_TABLE,
    Item: {
      organisationId: event.request.userAttributes['custom:organisationId'],
      organisationName: event.request.userAttributes['custom:organisationName'],
      userId: event.userName,
      email: event.request.userAttributes.email,
      firstName: event.request.userAttributes.name,
      createdAt: Date.now(),
      status: "Confirmed"
    }
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      return;
    }
    callback(null, event);
  });
}