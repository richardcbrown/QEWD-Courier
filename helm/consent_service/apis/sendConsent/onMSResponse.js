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
  
    console.log('api/sendConsent|onMSResponse|start');

    const getPatientsRequest = {
        path: '/api/consent/patients',
        method: 'POST'
    };

    forward(getPatientsRequest, message.serviceJwt, function(responseObj) {
        if (responseObj.message.error) {
            console.log(responseObj.message.error);
        }

        sendBack({ message: { ok: true } });
    });

    console.log('api/sendConsent|onMSResponse|end');
};