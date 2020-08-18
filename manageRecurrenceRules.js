import handler from "./libs/handler-lib";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatchEvents();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
const recurringPairAndEmailFunctionArn = process.env.RECURRING_PAIRANDEMAIL_LAMBDA_ARN;

export const main = handler(async (event, context) => {
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
    throw err;
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
      try {
        await cloudWatch.describeRule({Name: ruleName}).promise();
      } catch(err) {
        if (err.message.includes('does not exist')) {
          return (orgId + "'s recurrence rule is now set to 'Never'");
        } else {
          throw err;
        }
      };

      try {
        await cloudWatch.removeTargets({Ids: [orgId], Rule: ruleName}).promise();
        await cloudWatch.deleteRule({Name: ruleName}).promise();
        await dynamoPutFrequency();
        return (orgId + "'s recurrence rule is now set to 'Never'");
      } catch(err) {
        throw err;
      }
    default:
      throw new Error('Invalid frequency');
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
    return (orgId + "'s recurrence rule " + scheduleExpression + " was added");
  } catch(err) {
      throw err;
  }
});