import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();
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
  const data = JSON.parse(event.body);
  const recipient = data.email;

  // SCAN :-( dynamodb for the user with this email in order to get the orgId and userId
  const dbParams = {
    ExpressionAttributeNames: { "#email": "email"},
    ExpressionAttributeValues: { ':email': recipient },
    FilterExpression: '#email = :email',
    ProjectionExpression: "organisationId, userId, firstName",
    TableName: process.env.USERS_TABLE,
  };

  let qryResult;
  try {
    qryResult = await dynamoDb.scan(dbParams).promise();
  } catch(e) {
    returnFalse("something went wrong when querying dynamoDB");
  }

  // assume there is at most one user with that email address for now..!
  const userData = qryResult.Items[0];

  if (!userData) returnFalse("The user was not found");

  const orgId = userData.organisationId;
  const userId = userData.userId;
  const name = userData.firstName;

  // Get sender as environmental variable or hardcode in here. For now, use personal gmail.
  const sender = "mikkel.hlauritzen@gmail.com";
  // TODO take baseURL from env var
  const baseURL = 'http://localhost:3000/unsubscribe/';
  const charset = "UTF-8";
  const ses = new AWS.SES();

  const employeeLink = baseURL + orgId + '/' + userId;
  // The subject line for the email.
  const subject = `Unsubscribe requested: please confirm`;

  // The email body for recipients with non-HTML email clients.
  const body_text = `Hi ${name},\r\n"
                  + "We received your request to unsubscribe from CoffeeWorks emails."
                  + "To verify that you're you, please confirm by clicking this link: ${employeeLink}"
                  + "Should you want to get back to receiving watercooler chats, contact your organisation admin."`;

  // The HTML body of the email.
  const body_html = `<html>
  <head></head>
  <body>
    <p>Hi ${name},
    We received your request to unsubscribe from CoffeeWorks emails.
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

  try {
    await ses.sendEmail(params).promise();
    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(`${userId} successfully unsubscribed`)
    };
    callback(null, response);
  } catch(e) {
    console.log(JSON.stringify(e,null,2));
    returnFalse("Something went wrong when sending the email. Error message: " + e.message);
  }
}