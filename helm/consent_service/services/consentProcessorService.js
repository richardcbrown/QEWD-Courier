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

const request = require('request');
const moment = require('moment');

function requestAsync(args, { formatter } = {}) {

    return new Promise((resolve, reject) => {
        request(args, (err, response, body) => {
    
            if (err) return reject(err);
    
            if (response.statusCode !== 200 && response.statusCode !== 201) {
                return reject(body);
            }
    
            //debug('body: %s', body);
    
            if (formatter) {
                return resolve(formatter(body));
            }
    
            return resolve(body);
        });
    });
}

function mapPatientResource(patientId, resource, config) {
    if (process.env.node_env === 'development') {

        const { nhsNumberMapping } = config;
  
        if (nhsNumberMapping && nhsNumberMapping[`${ patientId }`]) {
          const patientDetails = nhsNumberMapping[`${ patientId }`];

          return {
              ...resource,
              ...patientDetails
          }
        }
    }

    return resource;
}

class LthtConsentProvider {
    constructor(cache, clientConfig) {
        this.cache = cache;
        this.clientConfig = clientConfig;
    }

    async sendConsent() {
        console.log('LthtConsentProvider|sendConsent|start');

        const { cache, clientConfig } = this;
        
        const authenticator = new OAuthTokenAuthenticationProvider(clientConfig);
        
        const consenting = cache.$('ConsentingPatients').getDocument(true) || {};

        for (const patientId of Object.keys(consenting)) {
            try {
                const completed = cache.$('CompletedPatients').getDocument(true) || {};

                const completedPatient = completed[patientId] || [];

                if (completedPatient && completedPatient.some((cp) => cp === clientConfig.name)) {
                    continue;
                }

                const patient = cache.$(patientId).getDocument(true);

                const { fullUrl, resource } = patient;

                const { resourceType, id, identifier, birthDate } = mapPatientResource(patientId, resource, this.clientConfig);

                const requestArgs = {
                    url: `${this.clientConfig.consent.endpoint}`,
                    method: this.clientConfig.consent.method,
                    body: {
                        fullUrl,
                        resource: {
                            resourceType,
                            id,
                            identifier,
                            birthDate,
                            extension: [{
                                url: 'https://fhir.leedsth.nhs.uk/ValueSet/phr-consent-1',
                                valueBoolean: true
                            }],
                        }
                    },
                    json: true
                };
            
                if (this.clientConfig.auth.proxy) {
                    tokenRequest.proxy = this.clientConfig.auth.proxy;
                }

                const request = await authenticator.authenticate(requestArgs);

                await requestAsync(request);

                completed[patientId] = [...completedPatient, clientConfig.name];

                cache.$('CompletedPatients').setDocument(completed);
            } catch (error) {
                console.log(error)
            }
        }

        console.log('LthtConsentProvider|sendConsent|complete');
    }
}

class OAuthTokenAuthenticationProvider {
    
    constructor(clientConfig) {
        this.clientConfig = clientConfig;
    }
    
    async authenticate(request) {
        console.log('OAuthTokenAuthenticationProvider|authenticate|start');

        const { token, expiry } = this;

        request.headers = request.headers || {};

        if (expiry && !moment(expiry).isAfter(moment.now())) {            
            request.headers['authorization'] = `Bearer ${token}`;
            return request;
        }

        const tokenRequest = {
            url: `${this.clientConfig.auth.endpoint}`,
            method: this.clientConfig.auth.method,
            form: {
                'grant_type': this.clientConfig.auth.grant_type,
                'scope': this.clientConfig.auth.scope
            },
            headers: {
                'authorization': `Basic ${ Buffer.from(this.clientConfig.client_id + ':' + this.clientConfig.client_secret).toString('base64')}`
            }
        };

        if (this.clientConfig.auth.proxy) {
            tokenRequest.proxy = this.clientConfig.auth.proxy;
        }

        const response = await requestAsync(tokenRequest);
    
        this.token = response[this.clientConfig.token_property];
        this.expiry = response[this.clientConfig.expiry_property];

        request.headers['authorization'] = `Bearer ${this.token}`;
        
        console.log('OAuthTokenAuthenticationProvider|authenticate|complete');
        
        return request;
    }
}

class ConsentProcessorService {
    constructor(pendingCache, hostConfig) {
        this.pendingCache = pendingCache;
        this.hostConfig = hostConfig;
    }

    getConsentProvider(cache, config) {
        switch(config.provider) {
            case "ltht": {
                return new LthtConsentProvider(cache, config);
            }
            default: {
                return null
            }
        }
    }

    async process() {
        console.log('ConsentProcessor|process|start');

        const { pendingCache, hostConfig } = this;

        for (const notificationPoint of hostConfig.notification_points) {
            const provider = this.getConsentProvider(pendingCache, notificationPoint);

            try {
                await provider.sendConsent();
            } catch (error) {
                console.log(error);
            } 
        }

        console.log('ConsentProcessor|process|sendConsent|sent');

        const providerNames = hostConfig.notification_points.map((np) => np.name);

        const consenting = pendingCache.$('ConsentingPatients').getDocument(true) || {};
        const completed = pendingCache.$('CompletedPatients').getDocument(true) || {};
        
        console.log('ConsentProcessor|process|tidyUp');

        for (const patientId of Object.keys(completed)) {
            const completedNames = completed[patientId];

            if (providerNames.every((pn) => completedNames.some((cn) => cn === pn))) {
                delete completed[patientId];
                delete consenting[patientId];
            }
        }

        pendingCache.$('ConsentingPatients').delete();
        pendingCache.$('CompletedPatients').delete();

        pendingCache.$('ConsentingPatients').setDocument(consenting);
        pendingCache.$('CompletedPatients').setDocument(completed);

        console.log('ConsentProcessor|process|complete');
    }
}

module.exports = ConsentProcessorService;