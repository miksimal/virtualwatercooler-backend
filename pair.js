import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();

export function main(event, context, callback) {
  const data = JSON.parse(event.body);
  const orgId = data.orgId;
  const confirmed = "Confirmed";

  const params = {
    ExpressionAttributeNames: { "#organisationId": "organisationId", "#status": "status" },
    ExpressionAttributeValues: { ':orgId': orgId, ':confirmed': confirmed },
    KeyConditionExpression: '#organisationId = :orgId',
    FilterExpression: '#status = :confirmed',
    TableName: process.env.MAIN_TABLE,
  };

  dynamoDb.query(params, (error, data) => {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true
    };

    if (error) {
      const response = {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ status: false })
      };
      callback(null, response);
      return;
    }

    let shuffledArray = data.Items.map(e => ({email: e.email, firstName: e.firstName, organisationName: e.organisationName}));

    for(let i = shuffledArray.length-1; i > 0; i--){
      const j = Math.floor(Math.random() * i);
      const temp = shuffledArray[i];
      shuffledArray[i] = shuffledArray[j];
      shuffledArray[j] = temp;
    }

    let pairs = [];
    let i = shuffledArray.length-1;
    while(i>=0) {
      if(i>=1){
        let pair = [shuffledArray[i], shuffledArray[i-1]];
        pairs.push(pair);
        i = i -2;
      }
      else if(i==0){
        let pair = [shuffledArray[i], shuffledArray[i+1]];
        pairs.push(pair);
        i--;
      }
    }

    const response = {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(pairs)
    };
    callback(null, response);
  });
}