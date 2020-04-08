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

  22 March 2020

*/

'use strict';

const logger = require('../../logger').logger;

const js = require('jwt-simple');
const globalConfig = require('/opt/qewd/mapped/configuration/global_config.json');
const config = require('/opt/qewd/mapped/configuration/config.json');

module.exports = function(message, jwt, forward, sendBack) {
    try {
        console.log('api/getTerms|onMSResponse');

        const policies = globalConfig["initialisation_service"].policies;
        const nameMappings = globalConfig["initialisation_service"].nameMappings;

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

            const namePolicies = responseObj.message.resources;

            namePolicies.forEach(policy => {
                policy.name = nameMappings[policy.name] || policy.name       
            });

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
    } catch (error) {
        logger.error('', error);
    }
};