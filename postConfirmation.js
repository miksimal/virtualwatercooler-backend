import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export function main(event, context, callback) {
  const orgId = event.request.userAttributes['custom:organisationId'];
  const PK = "ORG#" + orgId;
  const email = event.request.userAttributes.email;
  const SK = "MEMBER#" + email;

  const memberParams = {
    TableName: process.env.MAIN_TABLE,
    Item: {
      PK: PK,
      SK: SK,
      GSI1PK: PK,
      GSI1SK: "Super Admin",
      cognitoUserId: event.userName,
      email: email,
      name: event.request.userAttributes.name,
      status: "Active",
      type: "Member"
    }
  };

  const organisationParams = {
    TableName: process.env.MAIN_TABLE,
    Item: {
      PK: PK,
      SK: PK,
      GSI1PK: PK,
      GSI1SK: PK,
      name: event.request.userAttributes['custom:organisationName'],
      orgId: orgId,
      frequency: "Never",
      type: "Organisation"
    }
  };

  const params = {
    TransactItems: [{Put: memberParams}, {Put: organisationParams}]
  };

  dynamoDb.transactWrite(params, (error) => {
    if (error) {
      console.log(error);
      return;
    }
    callback(null, event);
  });
}