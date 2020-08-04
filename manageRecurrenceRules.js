import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatchEvents();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
const recurringPairAndEmailFunctionArn = process.env.RECURRING_PAIRANDEMAIL_LAMBDA_ARN;
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true
};

export async function main(event, context, callback) {
  const returnFalse = (bodyText) => {
    const response = {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify(bodyText)
    };
    callback(null, response);
    return;
  };

  let orgId;

  const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;
  const parts = authProvider.split(':');
  const userPoolIdParts = parts[parts.length - 3].split('/');
  const userPoolUserId = parts[parts.length-1];
  const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];
  const getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };
  try {
    let data = await cognitoidentityserviceprovider.adminGetUser(getUserParams).promise();
    orgId = data.UserAttributes.find(attr => attr.Name == 'custom:organisationId').Value;
  } catch(err) {
    console.log(err, err.stack);
    returnFalse(err.message);
  }

  const frequency = JSON.parse(event.body);
  const ruleName = orgId + "-" + process.env.STAGE;

  const dynamoPutFrequency = async () => {
    const params = {
      TableName: process.env.USERS_TABLE,
      Item: {
        organisationId: orgId,
        userId: "RecurrenceRule",
        frequency: frequency
      }
    };
    dynamoDb.put(params).promise();
  };

  let scheduleExpression;
  switch(frequency) {
    case 'Mondays':
      scheduleExpression = "cron(0 12 ? * MON *)";
      break;
    case 'Tuesdays':
      scheduleExpression = "cron(0 12 ? * TUE *)";
      break;
    case 'Wednesdays':
      scheduleExpression = "cron(0 12 ? * WED *)";
      break;
    case 'Thursdays':
      scheduleExpression = "cron(0 12 ? * THU *)";
      break;
    case 'Fridays':
      scheduleExpression = "cron(0 12 ? * FRI *)";
      break;
    case 'Every 5 Minutes':
      scheduleExpression = "cron(0/5 * * * ? *)";
      break;
    case 'Daily':
      scheduleExpression = "cron(0 12 * * ? *)";
      break;
    case 'Never':
      let ruleExists;
      try {
        await cloudWatch.describeRule({Name: ruleName}).promise();
        ruleExists = true;
      } catch(e) {
        JSON.stringify(e, null, 2);
        if (e.message.includes('does not exist')) {
          ruleExists = false;
        } else {
          returnFalse(e.message);
        }
      };
      const successResponse = {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify(orgId + "'s recurrence rule is now set to 'Never'")
      };

      if (ruleExists) {
        try {
          await cloudWatch.removeTargets({Ids: [orgId], Rule: ruleName}).promise();
          await cloudWatch.deleteRule({Name: ruleName}).promise();
          await dynamoPutFrequency();

          callback(null, successResponse);
          return;
        } catch(e) {
          returnFalse(e.message);
        }
      } else {
        callback(null, successResponse);
        return;
      }
      break;
    default:
      returnFalse('Invalid frequency');
  }

  try {
    await cloudWatch.putRule({
      Name: ruleName,
      ScheduleExpression: scheduleExpression
    }).promise();

    await cloudWatch.putTargets({
      Rule: ruleName,
      Targets: [
        {
          Id: orgId,
          Arn: recurringPairAndEmailFunctionArn,
          Input: JSON.stringify({
            organisationId: orgId
          })
        }
      ]
    }).promise();

    await dynamoPutFrequency();

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(orgId + "'s recurrence rule " + scheduleExpression + " was added")
    };
    callback(null, response);
  } catch(error) {
      returnFalse(error.message);
  }
}