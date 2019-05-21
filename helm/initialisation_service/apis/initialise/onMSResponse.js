const js = require('jwt-simple');
const config = require('../../configuration/config.json');

module.exports = function(message, jwt, forward, sendBack) {
  
  console.log('in initialise onMSResponse')
  console.log(message)

  if (!message.authenticated) {
    return false;
  }

  const consentRequest = {
    path: `/api/fhir/getPatientConsent`,
    method: 'GET'
  };
    
  var apiRequest = {
    path: `/api/fhir/getPolicies?name=Test`,
    method: 'GET'
  };
  
  forward(apiRequest, jwt, function(responseObj) {

    console.log("Policy Response")
    console.log(responseObj);

    forward(consentRequest, jwt, function(consentResponse) {
      
      console.log("Consent Response")
      console.log(consentResponse);
      console.log("Policies")
      console.log(responseObj.message.resources)

      if (!consentResponse.message.resources.length) {

        console.log('Terms need to be signed')

        sendBack({ message: { ...message, status: 'sign_terms' } });
      } else {
      
        const acceptedPolicies = [];

        const consents = consentResponse.message.resources;
        const policies = responseObj.message.resources;

        policies.forEach(policy => {
          consents.forEach(consent => {

            console.log(consent.policyRule);

            if (consent.policyRule === `Policy/${ policy.id }`) {
              acceptedPolicies.push(policy.id);
            }
          });        
        });

        let allAccepted = true;

        policies.forEach(policy => {
          if (!acceptedPolicies.find(ap => ap === policy.id)) {
            allAccepted = false;
          }
        })

        console.log('Accepted policies')
        console.log(acceptedPolicies)

        if (!allAccepted) {

          console.log('Terms need to be signed')

          sendBack({ message: { ...message, status: 'sign_terms' } });
        } else {

          console.log("JWT")
          console.log(jwt)

          const meta = js.encode({ signedTerms: true }, config.jwt.secret);

          sendBack({ message: { ...message, status: 'login', meta } });
        }
      }
    });
  });
};