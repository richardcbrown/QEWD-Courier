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

const topThreeThingsTransformation = require('../../services/topThreeThingsTransformationService');
const ConsentChecker = require('../../services/checkConsentService');
const globalConfig = require('/opt/qewd/mapped/configuration/global_config.json');

module.exports = function(message, jwt, forward, sendBack) {
  
    console.log('api/transformTopThreeThings|onMSResponse');
  
    if (message.error) {
        return sendBack(message);
    }

    console.log(message)

    const { patientId, site } = message;

    const organisationJwt = message.jwt;

    console.log('api/transformTopThreeThings|onMSResponse|consent');

    const consentPromise = new ConsentChecker(globalConfig).checkConsent(patientId, organisationJwt, forward);

    consentPromise.then(() => {

        var apiRequest = {
            path: `/api/fhir/patient/${patientId}`,
            method: 'GET'
        };
    
        const patientPromise = new Promise((resolve, reject) => {
    
            forward(apiRequest, organisationJwt, function(responseObj) {
        
                console.log('api/transformTopThreeThings|onMSResponse|getPatient');
            
                if (responseObj.message.error) {
            
                    console.log('api/transformTopThreeThings|onMSResponse|err', JSON.stringify(responseObj.message.error));
            
                    return reject(responseObj);
                }
            
                console.log('api/transformTopThreeThings|onMSResponse|getPatient|complete');
            
                resolve(responseObj.message.resources)
            });
        });
    
        var openEhrRequest = {
            path: `/api/openehr/hscn/${site}/top3Things/${patientId}`,
            method: 'GET'
        }
    
        const topThreeThingsPromise = new Promise((resolve, reject) => {
            
            forward(openEhrRequest, organisationJwt, function(responseObj) {
        
                console.log('api/transformTopThreeThings|onMSResponse|getTopThreeThings');
            
                if (responseObj.message.error) {
            
                    console.log('api/transformTopThreeThings|onMSResponse|getTopThreeThings|err', JSON.stringify(responseObj.message.error));
            
                    return reject(responseObj);
                }
            
                console.log('api/transformTopThreeThings|onMSResponse|getTopThreeThings|complete');
            
                resolve(responseObj.message)
            });
        })
    
        Promise.all([patientPromise, topThreeThingsPromise]).then((results) => {
            console.log('api/transformTopThreeThings|onMSResponse|results');
    
            console.log(results);
    
            const [patient, topThreeThings] = results;
    
            const transformed = topThreeThingsTransformation(topThreeThings, patient);
    
            sendBack({ message: transformed });
        }).catch((error) => {
            console.log('api/transformTopThreeThings|onMSResponse|err');
    
            console.log(error)
    
            sendBack({ message: { status: { code: 500, error: "An error occurred" } }});
        });

    }).catch((error) => {
        console.log('api/transformTopThreeThings|onMSResponse|consent|err');
        
        if (error.error === "patient_notfound") {
            return sendBack({ message: { status: { code: 404 }, error: "Patient not found" }});
        }

        return sendBack(error);
    });
};