const js = require('jwt-simple');
const globalConfig = require('/opt/qewd/mapped/configuration/global_config.json');
const config = require('/opt/qewd/mapped/configuration/config.json');

module.exports = function(message, jwt, forward, sendBack) {
  
  console.log('api/getTerms|onMSResponse');

  const policies = globalConfig["initialisation_service"].policies;

  var apiRequest = {
    path: `/api/fhir/getPolicies?name=${ policies }`,
    method: 'GET'
  };

  console.log('api/getTerms|onMSResponse|policicies', JSON.stringify(policies));

  const consentRequest = {
    path: `/api/fhir/getPatientConsent/null`,
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

        return sendBack(consentResponse);
      }

      if (!consentResponse.message.resources.length) {

        console.log('api/initialise|onMSResponse|getConsent|response|signTerms|noConsent');

        sendBack(responseObj);
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

          sendBack(responseObj);
        } else {

          console.log('api/initialise|onMSResponse|getConsent|response|allTermsAccepted');

          const meta = js.encode({ signedTerms: true }, config.jwt.secret);

          sendBack({ message: { ...message, status: 'login', meta } });
        }
      }
    });
  });
};