export default async function getCallerInfo(event, cognitoidentityserviceprovider) {
  const authProvider = event.requestContext.identity.cognitoAuthenticationProvider;
  const parts = authProvider.split(':');
  const userPoolIdParts = parts[parts.length - 3].split('/');
  const userPoolUserId = parts[parts.length-1];
  const userPoolId = userPoolIdParts[userPoolIdParts.length - 1];

  const getUserParams = {
    UserPoolId: userPoolId,
    Username: userPoolUserId
  };
  try {
    const data = await cognitoidentityserviceprovider.adminGetUser(getUserParams).promise();
    const callerInfo = {
      adminName: data.UserAttributes.find(attr => attr.Name == 'name').Value,
      orgId: data.UserAttributes.find(attr => attr.Name == 'custom:organisationId').Value,
      orgName: data.UserAttributes.find(attr => attr.Name == 'custom:organisationName').Value // TODO would be better to get orgname from dynamo
    };
    return callerInfo;
  } catch(err) {
    throw err;
  }
}