import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cloudWatch = new AWS.CloudWatchEvents();
const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true
};

const requesterIsAuthorised = async (requestedOrgId, requestContext) => {
  const authProvider = requestContext.identity.cognitoAuthenticationProvider;
  const parts = authProvider.split(':');
  const userPoolIdParts = parts[parts.length - 3].split('/');
  const userPoolUserId = parts[parts.length-1];
  const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];

  let orgId;
  const getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };
  try {
    let data = await cognitoidentityserviceprovider.adminGetUser(getUserParams).promise();
    orgId = data.UserAttributes.find(attr => attr.Name == 'custom:organisationId').Value;
  } catch(err) {
    console.log(err, err.stack);
    return false;
  }
  return orgId == requestedOrgId;
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

  const recurringPairAndEmailFunctionArn = process.env.RECURRING_PAIRANDEMAIL_LAMBDA_ARN;
  const data = JSON.parse(event.body);
  const orgId = data.organisationId;
  const frequency = data.frequency;

  // Confirm that the caller is of that orgId (cognito caller properties)
  if (!requesterIsAuthorised(orgId, event.requestContext)) {
    returnFalse('Requester not authorised');
  }

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
    case 'Every5Minutes':
      scheduleExpression = "cron(0/5 * * * ? *)";
      break;
    case 'EveryDay':
      scheduleExpression = "cron(0 12 * * ? *)";
      break;
    default:
      returnFalse('Invalid frequency');
  }
  // docs here: https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html

  // Create: using putRule
  const ruleName = orgId + "-" + process.env.STAGE;

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

    const params = {
      TableName: process.env.USERS_TABLE,
      Item: {
        organisationId: orgId,
        userId: "RecurrenceRule",
        frequency: frequency
      }
    };

    await dynamoDb.put(params).promise();

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(orgId + "'s recurrence rule " + scheduleExpression + " was added")
    };
    callback(null, response);
  } catch(error) {
      returnFalse(error.message);
  }

  // TODO later: - Delete:
    // - removeTargets and deleteRule
    // - remove recurring rule item from dynamodb (can decide whether want no entry for orgs that don’t have rules or we want an empty recurring rule property)
}