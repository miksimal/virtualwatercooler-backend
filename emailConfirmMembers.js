import AWS from "aws-sdk";
import handler from "./libs/handler-lib";
import wait from "./libs/wait-lib";

const ses = new AWS.SES();
const baseURL = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + '/confirmation/';
const MAX_SENDABLE_PER_SECOND = 19;

const sendEmail = async (ses, member, adminInfo) => {
  const sender = "watercooler@virtualwatercooler.xyz";
  const charset = "UTF-8";
  const adminName = adminInfo.adminName;
  const orgName = adminInfo.orgName;
  const orgId = adminInfo.orgId;

  const recipient = member.email;
  const name = member.name;
  const employeeLink = baseURL + orgId + '/' + member.email + '/' + member.tokenId;

  const subject = `Confirmation required: ${adminName} added you to Virtual Watercooler for ${orgName}`;

  const body_text = `Hi ${name},\r\n"
                  + "${adminName} added you to Virtual Watercooler for ${orgName}."
                  + "Once you've confirmed, you'll occassionally be paired up with "
                  + "coworkers for a brief watercooler chat. ${adminName} will tell you more about it."
                  + "Please click this link to confirm: ${employeeLink}`;

  // The HTML body of the email.
  const body_html = `<html>
  <head></head>
  <body>
    <h2>${adminName} added you to Virtual Watercooler for ${orgName}.</h2>
    <p>Once you've confirmed, you'll occassionally be paired up with coworkers for a brief watercooler chat. ${adminName} will tell you more about it.
    Please click <a href=${employeeLink}>this link</a> to confirm.
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

  return ses.sendEmail(params).promise();
};

//TODO dont really need to wrap this in handler?
export const main = handler(async (event, context) => {
  const message = JSON.parse(event.Records[0].body);
  const memberArray = message.memberArray;

  const promisesArray = [];
  let sentWithoutPauseCount = 0;
  for (const member of memberArray) {
    if (sentWithoutPauseCount === MAX_SENDABLE_PER_SECOND) {
      sentWithoutPauseCount = 0;
      await wait(1050);
    }
    promisesArray.push(sendEmail(ses, member, message.adminInfo));
    sentWithoutPauseCount++;
  }

  const results = await Promise.allSettled(promisesArray);

  const failedSends = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status == "rejected") {
      failedSends.push(memberArray[i].email);
    }
  }

  if (failedSends.length !== 0) throw new Error("Unable to send confirmation emails to the following members: " + failedSends.join(", "));
});