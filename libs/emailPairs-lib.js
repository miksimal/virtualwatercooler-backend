export default function emailPairs(pairs, ses, unsubscribeLink, organisationName) {
  // this approach is a bit shaky.. It will fail if one email fails to send, so risk that user emails everyone twice. Having a lambda get triggered with a single email at a time from an SQS queue probably better (LATER).
  // And/or adjust so it fits with my 20 emails per second SES limit (i.e. fire off 20, wait 1 sec, repeat. And/or get SES limit increased to, say, 60 per sec. Then restrict organisation sizes to max 100 people?)
  const sender = "watercooler@virtualwatercooler.xyz";
  const charset = "UTF-8";
  let promisesArray = [];

  for (let pair of pairs) {
    let recipientA = pair[0].email;
    let recipientB = pair[1].email;
    let nameA = pair[0].name;
    let nameB = pair[1].name;

    // The subject line for the email.
    const subject = `Water cooler: ${nameA} <> ${nameB} 👋☕️`;

    // The email body for recipients with non-HTML email clients.
    const body_text = `${nameA}, meet ${nameB}. ${nameB}, meet ${nameA}.\r\n"
                    + "You two should grab a quick water cooler chat soon!☕️"
                    + "What day and time would work well? Friday morning "
                    + "tends to be a good day for most people."
                    + "This email was sent by https://virtualwatercooler.xyz on behalf of ${organisationName}.`;

    // The HTML body of the email.
    const body_html = `<html>
    <head></head>
    <body>
      <h3>${nameA}, meet ${nameB}. ${nameB}, meet ${nameA}</h3>
      <p>You two should grab a quick water cooler chat soon!☕️ What day and time would work well? Friday morning tends to work well for most people.
      This email was sent by <a href="https://virtualwatercooler.xyz">Virtual Water Cooler</a> on behalf of ${organisationName}.
      If you no longer want to receive these emails, you can <a href=${unsubscribeLink}>unsubscribe here</a>.
    </body>
    </html>`;

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

    promisesArray.push(ses.sendEmail(params).promise());
  }

  return promisesArray;
}