import handler from "./libs/handler-lib";
import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export const main = handler(async (event, context) => {
  const data = JSON.parse(event.body);
  const recipient = data.email;

  // SCAN :-( dynamodb for the user with this email in order to get the orgId and userId
  // Just include the orgid as part of the unsubscribe URL. Then, with email in SK, I have all I need.
  const dbParams = {
    ExpressionAttributeNames: { "#email": "email"},
    ExpressionAttributeValues: { ':email': recipient },
    FilterExpression: '#email = :email',
    ProjectionExpression: "organisationId, userId, firstName",
    TableName: process.env.MAIN_TABLE,
  };

  let qryResult;
  try {
    qryResult = await dynamoDb.scan(dbParams).promise();
  } catch(e) {
    throw e;
  }

  // assume there is at most one user with that email address for now..!
  const userData = qryResult.Items[0];

  if (!userData) throw new Error({ message: "The user was not found" });

  const orgId = userData.organisationId;
  const userId = userData.userId;
  const name = userData.firstName;

  // Get sender as environmental variable or hardcode in here. For now, use personal gmail.
  const sender = "watercooler@virtualwatercooler.xyz";
  // TODO take baseURL from env var
  const baseURL = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + '/unsubscribe/';
  const charset = "UTF-8";
  const ses = new AWS.SES();

  const employeeLink = baseURL + orgId + '/' + userId;
  // The subject line for the email.
  const subject = `Unsubscribe requested: please confirm`;

  // The email body for recipients with non-HTML email clients.
  const body_text = `Hi ${name},\r\n"
                  + "We received your request to unsubscribe from Virtual Watercooler emails."
                  + "To verify that you're you, please confirm by clicking this link: ${employeeLink}"
                  + "Should you want to get back to receiving watercooler chats, contact your organisation admin."`;

  // The HTML body of the email.
  const body_html = `<html>
  <head></head>
  <body>
    <p>Hi ${name},
    We received your request to unsubscribe from Virtual Watercooler emails.
    To verify that you're you, please click <a href=${employeeLink}>this link</a> to confirm.
    Should you want to get back to receiving watercooler chats, contact your organisation admin.
    </p>
  </body>
  </html>`;

  const params = {
    Source: sender,
    Destination: {
      ToAddresses: [
        recipient
      ],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: charset
      },
      Body: {
        Text: {
          Data: body_text,
          Charset: charset
        },
        Html: {
          Data: body_html,
          Charset: charset
        }
      }
    }
  };

  await ses.sendEmail(params).promise();
  return (`${userId} successfully unsubscribed`);
});