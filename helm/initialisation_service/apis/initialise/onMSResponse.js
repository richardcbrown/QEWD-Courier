const js = require('jwt-simple');
const config = require('../../../configuration/config.json');

module.exports = function(message, jwt, forward, sendBack) {
  
  console.log('api/initialise|onMSResponse');

  if (!message.authenticated) {

    console.log('api/initialise|onMSResponse|notAuthenticated');

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
  
  console.log('api/initialise|onMSResponse|getPolicies');

  forward(apiRequest, jwt, function(responseObj) {

    console.log('api/initialise|onMSResponse|getPolicies|response');

    if (responseObj.message.error) {

      console.log('api/initialise|onMSResponse|getPolicies|err', JSON.stringify(responseObj.message.error));

      return sendBack(responseObj);
    }

    console.log('api/initialise|onMSResponse|getConsent');

    forward(consentRequest, jwt, function(consentResponse) {
      
      console.log('api/initialise|onMSResponse|getConsent|response');

      if (consentResponse.message.error) {
        console.log('api/initialise|onMSResponse|getConsent|response|err', JSON.stringify(consentResponse.message.error));

        return sendBack(responseObj);
      }

      if (!consentResponse.message.resources.length) {

        console.log('api/initialise|onMSResponse|getConsent|response|signTerms|noConsent');

        sendBack({ message: { ...message, status: 'sign_terms' } });
      } else {
      
        const acceptedPolicies = [];

        const consents = consentResponse.message.resources;
        const policies = responseObj.message.resources;

        policies.forEach(policy => {
          consents.forEach(consent => {
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

        if (!allAccepted) {

          console.log('api/initialise|onMSResponse|getConsent|response|notAllTermsAccepted');

          sendBack({ message: { ...message, status: 'sign_terms' } });
        } else {

          console.log('api/initialise|onMSResponse|getConsent|response|allTermsAccepted');

          const meta = js.encode({ signedTerms: true }, config.jwt.secret);

          sendBack({ message: { ...message, status: 'login', meta } });
        }
      }
    });
  });
};