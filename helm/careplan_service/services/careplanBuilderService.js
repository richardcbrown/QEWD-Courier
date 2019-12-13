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

function flattenCoding(coding) {
    let flattened = [];

    // fhir.Coding[]
    if (Array.isArray(coding)) {
        flattened = [...coding];
    } else if ((coding).coding) {
        const codes = (coding).coding || [];

        flattened = [...codes];
    } else {
        flattened = [coding];
    }

    return flattened;
}

function matchCoding(
    coding,
    targetCoding
) {
    if (!coding || !targetCoding) {
        return false;
    }

    const base = flattenCoding(coding);
    const target = flattenCoding(targetCoding);

    if (!base.length) {
        throw Error("No coding provided to compare");
    }

    if (!target.length) {
        throw Error("No coding to compare to");
    }

    return target.some((searchCode) => {
        return !!base.find((c) => c.code === searchCode.code && c.system === searchCode.system);
    });
}

class CarePlanTextService {
    getCareplanText(careplanData) {
        return {
            goal: this.getGoal(careplanData),
            questionnaires: this.getQuestionnaires(careplanData),
            testResults: this.getResultsText(careplanData),
            tests: this.getTestResultsText(),
            matters: this.getMattersText(),
            concerns: this.getConcernsText(),
            considerations: this.getConsiderationsText(),
            achievements: this.getAchievementsText()
        };
    }

    getGoal(careplanData) {
        const carePlanEntry = careplanData.entry
            .find((entry) => entry.resource && entry.resource.resourceType === "CarePlan");

        const careplan = carePlanEntry.resource;

        return careplan.contained.find((con) => con.resourceType === "Goal");
    }

    getQuestionnaires(careplanData) {
        const carePlanEntry = careplanData.entry
            .find((entry) => entry.resource && entry.resource.resourceType === "CarePlan");

        const careplan = carePlanEntry.resource;

        const containedQuestionnaire = careplan.contained.filter((con) => con.resourceType === "Questionnaire");
        
        const containedQuestionnaireResponses = careplan.contained.filter((con) => con.resourceType === "QuestionnaireResponse");

        const mappedQuestionnaires = [];

        containedQuestionnaire.forEach((q) => {
            const response = containedQuestionnaireResponses.find((qr) => {
                return qr.questionnaire.reference === `#${q.id}`
            });


            mappedQuestionnaires.push({
                questionnaire: q,
                response: response || {
                    id: `${q.id}Response`,
                    resourceType: "QuestionnaireResponse",
                    questionnaire: {
                        reference: `#${q.id}`
                    }
                }
            });
        });

        return mappedQuestionnaires;
    }

    getResultsText(careplanData) {
        const observations = careplanData.entry
            .filter((entry) => entry.resource && entry.resource.resourceType === "Observation")
            .map((entry) => entry.resource);

        const uniqueCodes = [];

        observations.forEach((obs) => {
            if (!uniqueCodes.some((uc) => matchCoding(uc, obs.code))) {
                uniqueCodes.push(obs.code);
            }
        });

        return {
            title: "Test Results",
            tests: this.getTestTextsForObservations(uniqueCodes)
        }
    }

    getTestResultsText() {   
        return {
            questionnaire: "HelmCarePlanTestResultsQuestions",
            questions: ["test-results"]
        };
    }

    getConsiderationsText() {
        return {
            questionnaire: "HelmCarePlanWhatMattersToYouQuestions",
            questions: ["considerations"]
        };
    }

    getMattersText() {    
        return {
            questionnaire: "HelmCarePlanWhatMattersToYouQuestions",
            questions: ["concerns-checkboxes"]
        };
    }

    getConcernsText() {
        return {
            questionnaire: "HelmCarePlanWhatMattersToYouQuestions",
            questions: ["concerns"]
        };
    }

    getAchievementsText() {
        return {
            questionnaire: "HelmCarePlanWhatMattersToYouQuestions",
            questions: ["achievements"]
        }
    }

    getGoalText() {
        return {
            titles: ["What would you like to achieve over the next year?"]
        }
    }

    getTestTextsForObservations(uniqueCodes) {
        const testResultTexts = [{
            mainCode: {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "75367002",
                        "display": "Blood pressure"
                    }
                ]
            },
            subCodes: [
                {
                    coding: [{ system: "http://snomed.info/sct", code: "72313002", display: "Systolic blood pressure" }]
                },
                {
                    coding: [{ system: "http://snomed.info/sct", code: "1091811000000102", display: "Diastolic arterial pressure" }]
                }
            ],
            title: "Blood Pressure Results",
            description: [
                "High blood pressure can put you at greater risk of having a heart attack or stroke.",
                "Readings below 140/90mm[Hg] are better or 140/80mm[Hg] if you have heart or kidney disease."
            ],
            readingsTitle: "Your last two blood pressure readings were:",
            readingsCount: 2,
            readingsFormatter: "bloodpressure"
        }];

        const matches = [];
    
        testResultTexts.forEach((testResultText) => {
            if (uniqueCodes.some((code) => matchCoding(testResultText.mainCode, code))) {
                matches.push(testResultText);
            }
        });

        return matches;
    }
}

class CarePlanObservationService {
    async getCareplanObservations(careplan, forward, jwt) {
        try {
            // get conditions in care plan
            const { addresses } = careplan

            const conditions = [];

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

            console.log(conditions)

            const mappedCodes = this.mapConditionsToObservationCodes(conditions);

            const flattenedCodes = mappedCodes.map((mappedCode) => `${mappedCode.coding[0].system}|${mappedCode.coding[0].code}`);

            const observationApiRequest = {
                path: `/api/fhir/resources/Observation?subject=Patient/5c4176f1-818a-49cc-8de2-82dc1288aa1e&code=${flattenedCodes.join(',')}`,
                method: 'GET'
            };

            const observationResult = await forwardPromise(observationApiRequest, forward, jwt);

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

            return  { careplan: combinedResult, text: new CarePlanTextService().getCareplanText(combinedResult) }
        } catch (error) {
            console.log('CarePlanBuilderService|buildCareplan|error');
            console.log(error);
        }
    }
}

module.exports = CarePlanBuilderService;