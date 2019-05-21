module.exports = function(message, jwt, forward, sendBack) {
  
  console.log("Accept Terms onMSResponse");
  console.log(message);
  
  var apiRequest = {
    path: `/api/fhir/postPatientConsent`,
    method: 'POST',
    body: message.consent
  };

  forward(apiRequest, jwt, function(responseObj) {
    
    console.log('FHIR POST CONSENT RESPONSE')
    console.log(responseObj)

    sendBack({ message: { status: 'login' } });
  });
};