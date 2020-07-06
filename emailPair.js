import AWS from "aws-sdk";

export function main(event, context, callback) {
  //const data = JSON.parse(event.body);
  // get two recipient emails from the event and set them to recipien
  // Get sender as environmental variable or hardcode in here. For now, use personal gmail.
  // Replace recipient@example.com with a "To" address. If your account
  // is still in the sandbox, this address must be verified.
  const recipientA = "mikkel.hlauritzen@gmail.com";
  const recipientB = "mikkel.hlauritzen@gmail.com";
  const name1 = "Mik1";
  const name2 = "Mik2";
  const organisationName = "MikOrg";
  const sender = "mikkel.hlauritzen@gmail.com";

  // The subject line for the email.
  const subject = `Water cooler: ${name1} <> ${name2} 👋☕️`;

  // The email body for recipients with non-HTML email clients.
  const body_text = `${name1}, meet ${name2}. ${name2}, meet ${name1}.\r\n"
                  + "You two should grab a quick water cooler chat soon!☕️"
                  + "What day and time would work well? Friday morning "
                  + "tends to be a good day for most people."
                  + "This email was sent by virtualwatercooler.com on behalf of ${organisationName}.`;

  // The HTML body of the email.
  const body_html = `<html>
  <head></head>
  <body>
    <h2>${name1}, meet ${name2}. ${name2}, meet ${name1}</h2>
    <p>You two should grab a quick water cooler chat soon!☕️ What day and time would work well? Friday morning tends to work well for most people.
    This email was sent by <a href="https://virtualwatercooler.com">Virtual Water Cooler </a> on behalf of ${organisationName}"
    If you no longer want to receive these emails, you can <a href="http://localhost:3000/unsubscribe">unsubscribe here</a>.
  </body>
  </html>`;

const charset = "UTF-8";
const ses = new AWS.SES();
var params = {
  Source: sender,
  Destination: {
    ToAddresses: [
      recipientA,
      recipientB
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
ses.sendEmail(params, function(err, data) {
  // Set response headers to enable CORS (Cross-Origin Resource Sharing)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  };
  if(err) {
    const response = {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ err })
    };
    callback(null, response);
    console.log(err.message);
    return;
  } else {
    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(data)
    };
    callback(null, response);
  }
});
}