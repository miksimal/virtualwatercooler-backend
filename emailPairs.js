import AWS from "aws-sdk";
import handler from "./libs/handler-lib";
import wait from "./libs/wait-lib";
import emailPair from "./libs/emailPair-lib";

const ses = new AWS.SES();
const MAX_SENDABLE_PER_SECOND = 19;

// TODO dont really need to wrap this in handler?
export const main = handler(async (event, context) => {
  const message = JSON.parse(event.Records[0].body);
  const pairs = message.pairs;

  const promisesArray = [];
  let sentWithoutPauseCount = 0;
  for (const pair of pairs) {
    if (sentWithoutPauseCount === MAX_SENDABLE_PER_SECOND) {
      sentWithoutPauseCount = 0;
      await wait(1050);
    }
    promisesArray.push(emailPair(ses, pair, message.orgId, message.orgName));
    sentWithoutPauseCount++;
  }

  const results = await Promise.allSettled(promisesArray);

  const failedSends = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status == "rejected") {
      failedSends.push(JSON.stringify(pairs[i]));
    }
  }

  if (failedSends.length !== 0) throw new Error("Unable to send pairing emails to the following pairs: " + failedSends.join(", "));
});