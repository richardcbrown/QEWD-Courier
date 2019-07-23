module.exports = function(message, jwt, forward, sendBack) {
  
  console.log('api/acceptTerms|onMSResponse');
  
  var apiRequest = {
    path: `/api/fhir/postPatientConsent`,
    method: 'POST',
    body: message.consent
  };

  forward(apiRequest, jwt, function(responseObj) {

    console.log('api/acceptTerms|onMSResponse|postPatientConsent');

    if (responseObj.message.error) {

      console.log('api/acceptTerms|onMSResponse|err', JSON.stringify(responseObj.message.error));

      return sendBack(responseObj);
    }

    console.log('api/acceptTerms|onMSResponse|postPatientConsent|complete');

    sendBack({ message: { status: 'login' } });
  });
};