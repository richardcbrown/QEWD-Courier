module.exports = function(message, jwt, forward, sendBack) {
  
  console.log("GET TERMS ON MS RESPONSE")
  console.log(message);
  
  var apiRequest = {
    path: `/api/fhir/getPolicies?name=Test`,
    method: 'GET'
  };

  forward(apiRequest, jwt, function(responseObj) {
    
    console.log('FHIR RESPONSE')
    console.log(responseObj)

    sendBack({ ok: true, message: { policies: responseObj.message.resources } });
  });
};