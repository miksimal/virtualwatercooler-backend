import AWS from "aws-sdk";
import emailPairs from "./libs/emailPairs-lib";

export async function main(event, context, callback) {
  const data = JSON.parse(event.body);
  const organisationName = data[0][0].organisationName;
  const ses = new AWS.SES();
  const unsubscribeLink = (process.env.STAGE == 'prod' ? process.env.PROD_URL : process.env.DEV_URL) + '/unsubscribe';
  // Validate that everyone have status == Confirmed?

  let promisesArray = emailPairs(data, ses, unsubscribeLink, organisationName);

  // Set response headers to enable CORS (Cross-Origin Resource Sharing)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true
  };

  try {
    await Promise.all(promisesArray);

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(data)
    };
    callback(null, response);
  } catch(err) {
    const response = {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ err })
    };
    callback(null, response);
    console.log(err.message);
  }
}