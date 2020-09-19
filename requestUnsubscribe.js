import handler from "./libs/handler-lib";
import AWS from "aws-sdk";
import * as uuid from "uuid";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.MAIN_TABLE;

export const main = handler(async (event, context) => {
  const data = JSON.parse(event.body);
  const recipient = data.email;
  const orgId = data.organisationId;
  const PK = 'ORG#' + orgId;
  const SK = 'MEMBER#' + recipient;

  const getParams = {
    Key: {
      PK: PK,
      SK: SK
    },
    TableName: tableName
  };

  const response = await dynamoDb.get(getParams).promise();
  const user = response.Item;
  if (!user) throw new Error(recipient + ' was not found - cannot unsubscribe');
  if (user.status === 'Unsubscribed') throw new Error(recipient + ' is already unsubscribed');

  const tokenId = uuid.v1();
  const token = "GOODBYETOKEN#" + tokenId;
  const tokenParams = {
    TableName: tableName,
    Item: {
      PK: token,
      SK: SK,
      type: "Token" // TODO add a time to live unix timestamp
    }
  };
  await dynamoDb.put(tokenParams).promise();

  const unsubscribeUrl = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + '/confirmunsubscribe/' + orgId + '/' + recipient + '/' + tokenId;
  const name = user.name;
  const sender = "watercooler@virtualwatercooler.xyz";
  const charset = "UTF-8";
  const ses = new AWS.SES();

  const subject = `Unsubscribe requested: please confirm`;

  const body_text = `Hi ${name},\r\n"
                  + We received your request to unsubscribe from Virtual Watercooler emails."
                  + "To verify that you're you, please confirm by clicking this link: ${unsubscribeUrl}"
                  + "Should you want to get back to receiving watercooler chats, contact your organisation admin."`;

  const body_html = `<html>
  <head></head>
  <body>
    <p>Hi ${name},
    We received your request to unsubscribe from Virtual Watercooler emails.
    To verify that you're you, please click <a href=${unsubscribeUrl}>this link</a> to confirm.
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
  return (`successfully sent confirm unsubscribe email to ${recipient}`);
});