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

const req = require("request-promise-native")
const globalConfig = require('/opt/qewd/mapped/configuration/global_config.json');
const logger = require('../../logger').logger;

module.exports = async function(args, finished) {
    try {
        console.log('api/initialise|invoke');

        var authenticated = false;

        if (args.req.headers.authorization) {
            var fin = function(obj) {
            // dummy function to allow us to validate the JWT without finishing
            //  the replacement function simply logs any JWT errors to the console / log
            console.log('JWT Authorization header error:');
            console.log(JSON.stringify(obj));
            };

            authenticated = this.jwt.handlers.validateRestRequest.call(this, args.req, fin, true, true);
            
            if (!authenticated) {

            console.log('api/initialise|invoke|err|jwtError');

            return finished({ error :"Invalid JWT: Error: Token expired", status: {code:403, text: "Forbidden"}})
            }
        }

        let lookupStatus = null

        if (authenticated) {
            const { job_credentials } = globalConfig["initialisation_service"]

            lookupStatus = await req({
                url: job_credentials.host,
                auth: { 
                    user: job_credentials.client_id, 
                    pass: job_credentials.client_secret 
                },
                method: "POST",
                json: true,
                body: { nhsNumber: args.session.nhsNumber }
            })
        }

        console.log('api/initialise|invoke|complete');

        return finished({ ok: true, authenticated, nhsNumber: args.session.nhsNumber, lookupStatus });
    } catch (error) {
        logger.error('', error);

        return finished({ error })
    }
}
