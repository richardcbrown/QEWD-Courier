const config = require('../../../configuration/global_config.json');

module.exports = function(message, jwt, forward, sendBack) {
  
  console.log('api/getTerms|onMSResponse');

  const policies = config["initialisation_service"].policies;

  var apiRequest = {
    path: `/api/fhir/getPolicies?name=${ policies }`,
    method: 'GET'
  };

  console.log('api/getTerms|onMSResponse|policicies', JSON.stringify(policies));

  forward(apiRequest, jwt, function(responseObj) {
    
    console.log('api/getTerms|onMSResponse|getTerms');

    if (responseObj.message.error) {

      console.log('api/getTerms|onMSResponse|getTerms|err', JSON.stringify(responseObj.message.error));

      return sendBack(responseObj);
    }

    console.log('api/getTerms|onMSResponse|getTerms|complete');

    sendBack({ ok: true, message: { policies: responseObj.message.resources } });
  });
};