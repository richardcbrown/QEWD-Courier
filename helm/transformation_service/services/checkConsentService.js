/*

 ----------------------------------------------------------------------------
 |                                                                          |
 | http://www.synanetics.com                                                |
 | Email: support@synanetics.com                                            |
 |                                                                          |
 | Author: Richard Brown                                                    |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  09 Oct 2019

*/

'use strict';

class ConsentChecker {
    
    constructor(config) {
        this.config = config;
    }

    checkConsent(patientId, jwt, forward) {

        const policies = this.config["initialisation_service"].policies;

        const consentPromise = new Promise((resolve, reject) => {

            console.log('api/checkTerms|onMSResponse');
    
            const consentRequest = {
                path: `/api/fhir/getPatientConsent/${patientId}`,
                method: 'GET'
            };
        
            var apiRequest = {
                path: `/api/fhir/getPolicies?name=${ policies }`,
                method: 'GET'
            };
            
            console.log('api/checkTerms|onMSResponse|getPolicies');
        
            forward(apiRequest, jwt, function(responseObj) {
        
                console.log('api/checkTerms|onMSResponse|getPolicies|response');
            
                if (responseObj.message.error) {
            
                    console.log('api/checkTerms|onMSResponse|getPolicies|err', JSON.stringify(responseObj.message.error));
            
                    return reject({ message: { status: { code: 500 }, error: responseObj.message.error }});
                }
            
                console.log('api/checkTerms|onMSResponse|getConsent');
        
                forward(consentRequest, jwt, function(consentResponse) {
                    
                    console.log('api/checkTerms|onMSResponse|getConsent|response');
            
                    if (consentResponse.message.error) {
                        console.log('api/checkTerms|onMSResponse|getConsent|response|err', JSON.stringify(consentResponse.message.error));
            
                        return reject({ message: { status: { code: 500 }, error: consentResponse.message.error }});
                    }
            
                    if (!consentResponse.message.resources.length) {
            
                        console.log('api/checkTerms|onMSResponse|getConsent|response|signTerms|noConsent');
                
                        return reject({ message: { status: { code: 403 }, error: "Patient has not accepted terms to allow release of this data" }});
                    } else {
                    
                        const acceptedPolicies = [];
                
                        const consents = consentResponse.message.resources;
                        const policies = responseObj.message.resources;
                
                        policies.forEach(policy => {
                            consents.forEach(consent => {
                                if ((consent.policy || []).some((cp) => cp.uri && cp.uri.includes(`Policy/${ policy.id }`))) {
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
                
                            console.log('api/checkTerms|onMSResponse|getConsent|response|notAllTermsAccepted');
                
                            return reject({ message: { status: { code: 403 }, error: "Patient has not accepted terms to allow release of this data" }});
                        } else {
                
                            console.log('api/checkTerms|onMSResponse|getConsent|response|allTermsAccepted');
                
                            resolve();
                        }
                    }
                });
            });
        });

        return consentPromise;
    }
}

module.exports = ConsentChecker;