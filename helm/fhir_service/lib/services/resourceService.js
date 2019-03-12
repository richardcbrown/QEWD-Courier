/*

 ----------------------------------------------------------------------------
 | ripple-cdr-discovery: Ripple Discovery Interface                         |
 |                                                                          |
 | Copyright (c) 2017-19 Ripple Foundation Community Interest Company       |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://rippleosi.org                                                     |
 | Email: code.custodian@rippleosi.org                                      |
 |                                                                          |
 | Author: Rob Tweed, M/Gateway Developments Ltd                            |
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

  13 February 2018

*/

'use strict';

const P = require('bluebird');
const { logger } = require('../core');
const { ResourceName } = require('../shared/enums');
const { getPractitionerRef, parseRef, getPatientUuid } = require('../shared/utils');
const debug = require('debug')('ripple-cdr-discovery:services:resource');

class ResourceService {
  constructor(ctx) {
    this.ctx = ctx;
  }

  static create(ctx) {
    return new ResourceService(ctx);
  }

  /**
   * Fetch patients
   *
   * @param {int|string} nhsNumber
   * @returns {Promise}
   */
  async fetchPatients(nhsNumber) {
    logger.info('services/resourceService|fetchPatients', { nhsNumber });

    const { patientCache } = this.ctx.cache;

    const exists = patientCache.byNhsNumber.exists(nhsNumber);
    debug('exists: %s', exists);

    if (exists) {
      return {
        ok: false,
        exists: true
      };
    }

    const { resourceRestService, tokenService } = this.ctx.services;

    const token = await tokenService.get();
    debug('token: %j', token);

    const data = await resourceRestService.getResources('Patient', `identifier=${ nhsNumber }`, token);
    debug('data: %j', data);

    if (!data || !data.entry) {
      return {
        ok: false,
        entry: false
      };
    }

    const result = {
      ok: true,
      totalCount: data.entry.length,
      processedCount: 0
    };

    data.entry.forEach((x) => {
      const patient = x.resource;
      const patientUuid = patient.id;

      if (!patientUuid) return;

      const exists = patientCache.byPatientUuid.exists(patientUuid);
      if (exists) return;

      patientCache.byPatientUuid.set(patientUuid, patient);
      //@TODO check if we really need it.
      patientCache.byPatientUuid.setNhsNumber(patientUuid, nhsNumber);
      patientCache.byNhsNumber.setPatientUuid(nhsNumber, patientUuid);

      result.processedCount++;
    });

    return result;
  }

  /**
   * Fetch a resource practioner
   *
   * @param  {string} resourceName
   * @param  {string} reference
   * @return {Promise}
   */
  async fetchPatientPractitioner(nhsNumber) {
    logger.info('services/resourceService|fetchPatientPractitioner', { nhsNumber });

    const { patientCache, resourceCache } = this.ctx.cache;

    const patientUuid = patientCache.byNhsNumber.getPatientUuid(nhsNumber);
    const patient = patientCache.byPatientUuid.get(patientUuid);

    console.log("PATIENT UUID")
    console.log(patientUuid)
    console.log(patient)

    const practitionerReference = getPractitionerRef(patient);

    // resource will be null if either:
    // - the practitioner is already cached; or
    // - the practioner is already in the process of being fetched in an earlier iteration
    const { resource } = await this.fetchResource(practitionerReference);

    debug('resource: %j', resource);
    if (!resource) return;

    resourceCache.byUuid.setPractitionerUuid('Patient', patientUuid, resource.id);

    // get PractitionerRole
    const roleResponse = await this.fetchResources('PractitionerRole', `practitioner=${ practitionerReference }`);
    
    const practionerRoleBundle = roleResponse.resource;

    if (!practionerRoleBundle) return;

    // ensure organisation records for practitioner are also fetched and cached
    await P.each(practionerRoleBundle.entry, async (entry) => {

      const role = entry.resource;

      if (role.resourceType !== 'PractitionerRole') return

      const organisationRef = role.organization.reference;
      const organisationResponse = await this.fetchResource(organisationRef);

      if (organisationResponse.resource) {
        resourceCache.byUuid.setRelatedUuid('Practitioner', resource.id, 'Organization', organisationResponse.resource.id)
      }
    });
  }

  /**
   * Fetch a resource
   *
   * @param  {string} reference
   * @return {Promise.<Object>}
   */
  async fetchResource(reference) {
    logger.info('services/resourceService|fetchResource', { reference });

    const { resourceName, uuid } = parseRef(reference);
    const { fetchCache, resourceCache } = this.ctx.cache;

    const exists  = resourceCache.byUuid.exists(resourceName, uuid);
    if (exists) {
      return {
        ok: false,
        exists: true
      };
    }

    const fetching = fetchCache.exists(reference);
    if (fetching) {
      return {
        ok: false,
        fetching: true
      };
    }

    const { tokenService, resourceRestService } = this.ctx.services;
    const token = await tokenService.get();

    fetchCache.set(reference);
    const resource = await resourceRestService.getResource(reference, token);

    debug('resource: %j', resource);

    resourceCache.byUuid.set(resourceName, uuid, resource);

    return {
      ok: true,
      resource
    };
  }

  /**
   * Fetch resources
   *
   * @param  {string} reference
   * @return {Promise.<Object>}
   */
  async fetchResources(resourceType, query) {
    logger.info('services/resourceService|fetchResources', { query });

    const { fetchCache, resourceCache } = this.ctx.cache;

    const exists  = resourceCache.byQuery.exists(resourceType, query);
    if (exists) {
      return {
        ok: false,
        exists: true
      };
    }

    const fetching = fetchCache.exists(query);
    if (fetching) {
      return {
        ok: false,
        fetching: true
      };
    }

    const { tokenService, resourceRestService } = this.ctx.services;
    const token = await tokenService.get();

    fetchCache.set(query);
    const resource = await resourceRestService.getResources(resourceType, query, token);

    debug('resource: %j', resource);

    resourceCache.byQuery.set(resourceType, query, resource);

    return {
      ok: true,
      resource
    };
  }

  /**
   * Gets resource practioner
   *
   * @param  {string} resourceName
   * @param  {strijg} uuid
   * @return {Object}
   */
  getPractitioner(resourceName, uuid) {
    logger.info('cache/resourceService|getPractitioner', { resourceName, uuid });

    const { resourceCache } = this.ctx.cache;
    const practitionerUuid = resourceCache.byUuid.getPractitionerUuid(resourceName, uuid);
    if (!practitionerUuid) return null;

    const practitioner = resourceCache.byUuid.get(ResourceName.PRACTITIONER, practitionerUuid);
    debug('practioner: %j', practitioner);

    return practitioner;
  }

}

module.exports = ResourceService;
