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

  08 Nov 2019

*/

'use strict';

function forwardPromise(apiRequest, forward, jwt) {
    return new Promise((resolve, reject) => {
        forward(apiRequest, jwt, function (responseObj) {
            if (responseObj.message.error) {
                reject(responseObj.message.error);
            } else {
                resolve(responseObj.message);
            }
        });
    });
}

class CarePlanObservationService {
    async getCareplanObservations(careplan, forward, jwt) {
        try {
            // get conditions in care plan
            const { addresses } = careplan

            const conditions = [];

            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")

            console.log(addresses)

            for (const conditionReference of addresses) {

                console.log(conditionReference)

                const conditionApiRequest = {
                    path: `/api/fhir/resources/${conditionReference.reference}`,
                    method: 'GET'
                };
    
                const condition = await forwardPromise(conditionApiRequest, forward, jwt);
    
                conditions.push(condition);
            }

            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")

            console.log(conditions)

            const mappedCodes = this.mapConditionsToObservationCodes(conditions);

            const flattenedCodes = mappedCodes.map((mappedCode) => `${mappedCode.coding[0].system}|${mappedCode.coding[0].code}`);

            const observationApiRequest = {
                path: `/api/fhir/resources/Observation?subject=Patient/ff62894d-8edd-4698-b52c-9d866f2c3d1e&code=${flattenedCodes.join(',')}`,
                method: 'GET'
            };

            const observationResult = await forwardPromise(observationApiRequest, forward, jwt);

            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")
            console.log("TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT")

            console.log(observationResult)

            return observationResult.resources.resource;
        } catch (error) {
            console.log(error);
        }
    }

    mapConditionsToObservationCodes(conditions) {
        const observationCodes = []

        //@TODO full implementation
        for (const condition of conditions) {
            const { code } = condition;

            observationCodes.push({
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "75367002",
                        "display": "Blood pressure"
                    }
                ]
            })
        }

        return observationCodes
    }
}

class CarePlanBuilderService {
    
    async buildCareplan(patientId, forward, jwt) {

        console.log('CarePlanBuilderService|buildCareplan|start');

        try {
                
            console.log('CarePlanBuilderService|buildCareplan|getPatient');
            
            const patientApiRequest = {
                path: `/api/fhir/patient/${patientId}`,
                method: 'GET'
            };

            const result = await forwardPromise(patientApiRequest, forward, jwt);

            console.log('CarePlanBuilderService|buildCareplan|getPatient|complete');

            const patientResult = result.resources;

            console.log('CarePlanBuilderService|buildCareplan|getPatientCareplan');

            const careplanApiRequest = {
                path: `/api/fhirstore/CarePlan?patient=Patient/${patientResult.resource.id}`,
                method: 'GET'
            };

            const careplanBundle = await forwardPromise(careplanApiRequest, forward, jwt);

            console.log(careplanBundle)

            console.log('CarePlanBuilderService|buildCareplan|getPatientCareplan|complete');

            const careplanResource = (careplanBundle.entry && careplanBundle.entry.find((entry) => entry.resource.resourceType === 'CarePlan')) || null;

            if (!careplanResource) {
                return null
            }

            const careplan = careplanResource.resource;

            const observationService = new CarePlanObservationService();

            const observationBundle = await observationService.getCareplanObservations(careplan, forward, jwt);

            const combinedResult = {
                resourceType: "Bundle",
                entry: [
                    {
                        resource: careplan
                    },
                    ...observationBundle.entry
                ]
            };

            return combinedResult
        } catch (error) {
            console.log('CarePlanBuilderService|buildCareplan|error');
            console.log(error);
        }
    }
}

module.exports = CarePlanBuilderService;