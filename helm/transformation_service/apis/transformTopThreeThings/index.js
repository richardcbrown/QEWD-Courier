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

const AuthenticateSiteService = require('../../services/authenticateSiteService')
const fileLogger = require('../../logger').logger;

function qewdifyError(err) {
  return {
    error: err.userMessage || err.message
  };
}

function getResponseError(err = new Error('Unknown error')) {
  const resultError = err.error ? err : qewdifyError(err);

  return resultError;
}

class AuthConfigurationProvider {
  constructor(config) {
    this.config = config
  }

  getSitesConfig() {
    return this.config.openehr.sites
  }

  getAuthUrl() {
    const authHost = this.config.oidc_client.hosts.oidc_server;
    const endpoint = this.config.oidc_client.urls.oidc_server.introspection_endpoint;
  
    return `${authHost}${endpoint}`
  }
}

module.exports = async function(args, finished) { 

    console.log('api/transformTopThreeThings|invoke');
  
    const authenticateSiteService = new AuthenticateSiteService(
      new AuthConfigurationProvider(this.userDefined.globalConfig)
    );

    try {

      await authenticateSiteService.authenticate(args.site, args.req.headers)

      var session = this.jwt.handlers.createRestSession.call(this, args);

      session.role = 'ORGANISATION';
      session.username = args.site;
      session.nhsNumber = args.patientId;
      session.authenticated = true;
      session.timeout = 600;

      var jwt = this.jwt.handlers.setJWT.call(this, session);

      finished({ site: args.site, patientId: args.patientId, jwt });
    } catch (error) {
      fileLogger.error(error.message, { stack: error.stack });

      const responseError = getResponseError(error);

      finished(responseError);
    }
}