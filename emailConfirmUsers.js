import AWS from "aws-sdk";

export async function main(event, context, callback) {
  // userArray is an array of objects like this: {userId: Item.userId, email: Item.email, firstName: Item.name}
  // adminInfo is an object: {orgName: orgName, adminName: adminName}}
  const adminInfo = event.adminInfo;
  const userArray = event.userArray;

  // Get sender as environmental variable or hardcode in here. For now, use personal gmail.
  // Replace recipient@example.com with a "To" address. If your account
  // is still in the sandbox, this address must be verified.

  // TODO take baseURL from env var
  const baseURL = 'http://localhost:3000/confirmation/'; // add the userID at the end for their unique endpoint
  const adminName = adminInfo.adminName;
  const orgName = adminInfo.orgName;
  const orgId = adminInfo.orgId;
  const sender = "mikkel.hlauritzen@gmail.com";
  const charset = "UTF-8";
  let promisesArray = [];
  const ses = new AWS.SES();

  for (let user of userArray) {

    const recipient = user.email;
    const name = user.firstName;
    const employeeLink = baseURL + orgId + '/' + user.userId;
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
      <h2>${adminName} added you to CoffeeIsWork for ${orgName}.</h2>
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