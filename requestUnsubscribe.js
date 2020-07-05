import AWS from "aws-sdk";

export async function main(event, context, callback) {
  const data = JSON.parse(event.body);
  const recipient = data.email;

  // query dynamodb for the user with this email in order to get the orgId and userId SCAN

  // Get sender as environmental variable or hardcode in here. For now, use personal gmail.

  // TODO take baseURL from env var
  const baseURL = 'http://localhost:3000/confirmation/'; // add the userID at the end for their unique endpoint
  const orgId = from dynamod;
  const userId = from dynamod;
  const sender = "mikkel.hlauritzen@gmail.com";
  const charset = "UTF-8";
  let promisesArray = [];
  const ses = new AWS.SES();



    const employeeLink = baseURL + orgId + '/' + userId;
    // The subject line for the email.
    const subject = `Confirmation required: ${adminName} added you to CoffeeIsWork for ${orgName}`;

    // The email body for recipients with non-HTML email clients.
    const body_text = `Hi ${name},\r\n"
                    + "${adminName} added you to CoffeeIsWork for ${orgName}."
                    + "Once you've confirmed, you'll occassionally be paired up with "
                    + "coworkers for a brief watercooler chat. ${adminName} will tell you more about it."
                    + "Please click this link to confirm: ${employeeLink}`;

    // The HTML body of the email.
    const body_html = `<html>
    <head></head>
    <body>
      <h1>${adminName} added you to CoffeeIsWork for ${orgName}.</h1>
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

    promisesArray.push(ses.sendEmail(params).promise());
  }

  try {
    await Promise.all(promisesArray);
    const response = JSON.stringify(promisesArray.length + " confirmation emails were sent");
    callback(null, response);
  } catch(err) {
    const response = JSON.stringify("Something went wrong. All or some of the " + promisesArray.length + " confirmation emails failed to send. Error message: " + err.message);
    callback(null, response);
  }
}