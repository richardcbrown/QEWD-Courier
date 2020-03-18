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

  22 Oct 2019

*/

'use strict';

module.exports = async function(message, jwt, forward, sendBack) {
  
    console.log('apis/getPatients|onMSResponse|start');
  
    const { patients } = message;

    const patientPromises = [];

    Object.keys(patients).forEach((patientId) => {
        const patientPromise = new Promise((resolve, reject) => {
            const patientRequest = {
                path: `/api/fhir/patient/${patientId}`,
                method: 'GET'
            };

            forward(patientRequest, jwt, function (responseObj) {
                const setPatientRequest = {
                    path: `/api/consent/patient/${patientId}`,
                    method: 'POST',
                    body: responseObj.message.resources
                };

                forward(setPatientRequest, jwt, function (setResponse) {
                    if (setResponse.error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        });

        patientPromises.push(patientPromise)
    });

    Promise.all(patientPromises).then(() => {
        sendBack({ message: { ok: true } });
    }).catch((error) => {
        console.log(error);
        sendBack({ message: { ok: false } });
    });

    console.log('apis/getPatients|onMSResponse|end');
};