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

module.exports = function(message, jwt, forward, sendBack) {
    try {
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

            const sendConsentApiRequest = {
            path: `/api/consent/send/${message.patientId}`,
            method: 'POST'
            };

            console.log('api/acceptTerms|onMSResponse|sendPatientConsent');

            forward(sendConsentApiRequest, jwt, function (consentResponse) {
            if (consentResponse.message.error) {
                console.log(consentResponse.message.error);
            }

            console.log('api/acceptTerms|onMSResponse|sendPatientConsent|complete');

            console.log('api/acceptTerms|onMSResponse|postPatientConsent|complete');

            sendBack({ message: { status: 'login' } });
            });
        });
    } catch (error) {
        logger.error('', error);
    }
};