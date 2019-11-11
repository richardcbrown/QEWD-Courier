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

module.exports = function(args, finished) { 
    console.log("apis/setPatient|start");

    const patientId = args.patientId;
    const patient = args.req.body;

    const pendingCache = this.db.use("Pending");

    pendingCache.$(patientId).setDocument(patient);

    const pending = pendingCache.$('PendingPatients').getDocument(true);
    
    const consenting = pendingCache.$('ConsentingPatients').getDocument(true) || {};

    consenting[patientId] = true;
    delete pending[patientId];

    pendingCache.$('ConsentingPatients').delete();
    pendingCache.$('PendingPatients').delete();

    pendingCache.$('ConsentingPatients').setDocument(consenting);
    pendingCache.$('PendingPatients').setDocument(pending);

    finished({ ok: true })

    console.log("apis/setPatient|end");
}