import handler from "./libs/handler-lib";
import getCallerInfo from "./libs/getCallerInfo-lib";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatchEvents();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
const recurringPairAndEmailFunctionArn = process.env.RECURRING_PAIRANDEMAIL_LAMBDA_ARN;

export const main = handler(async (event, context) => {

  const callerInfo = await getCallerInfo(event, cognitoidentityserviceprovider);
  const orgId = callerInfo.orgId;

  const frequency = JSON.parse(event.body);
  const ruleName = orgId + "-watercooler-" + process.env.STAGE;

  const PK = "ORG#" + orgId;
  const params = {
    ExpressionAttributeNames: { "#frequency": "frequency"},
    ExpressionAttributeValues: { ":frequency": frequency},
    TableName: process.env.MAIN_TABLE,
    Key: {
      PK: PK,
      SK: PK
    },
    ConditionExpression: "attribute_exists(PK)",
    UpdateExpression: "set #frequency = :frequency"
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
    case 'Saturdays':
      scheduleExpression = "cron(0 12 ? * SAT *)";
      break;
    case 'Sundays':
      scheduleExpression = "cron(0 12 ? * SUN *)";
      break;
    // case 'Every 5 Minutes':
    //   scheduleExpression = "cron(0/5 * * * ? *)";
    //   break; uncomment when needed for testing
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
        await dynamoDb.update(params).promise();
        return (orgId + "'s recurrence rule is now set to 'Never'");
      } catch(err) {
        throw err;
      }
    default:
      throw new Error('Invalid frequency');
  }

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

  await dynamoDb.update(params).promise();
  return (orgId + "'s recurrence rule " + scheduleExpression + " was added");
});