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

function topThreeThingsTransformation(topThreeThings, patient) {
    console.log("topThreeThingsTransformation");

    const transformed = {
        resourceType: "Composition",
        id: topThreeThings.sourceId,
        type: {
            coding: [{
                system: "https://fhir.myhelm.org/STU3/ValueSet/phr-composition-type-1",
                code: "T3T",
                display: "Patient Top 3 Things"
            }]
        },
        subject: {
            reference: patient.fullUrl,
            type: "Patient"
        },
        date: topThreeThings.dateCreated && new Date(topThreeThings.dateCreated).toISOString(),
        title: "PHR 3 Items",
        section: [
            {
                title: topThreeThings.name1 || null,
                code: {
                    coding: [{
                        system: "https://fhir.myhelm.org/STU3/ValueSet/phr-section-t3t-1",
                        code: "3T1",
                        display: "First of patient top 3 things"
                    }]
                },
                text: {
                    status: "generated",
                    div: topThreeThings.description1 || null
                }
            },
            {
                title: topThreeThings.name2 || null,
                code: {
                    coding: [{
                        system: "https://fhir.myhelm.org/STU3/ValueSet/phr-section-t3t-1",
                        code: "3T2",
                        display: "Second of patient top 3 things"
                    }]
                },
                text: {
                    status: "generated",
                    div: topThreeThings.description2 || null
                }
            },
            {
                title: topThreeThings.name3 || null,
                code: {
                    coding: [{
                        system: "https://fhir.myhelm.org/STU3/ValueSet/phr-section-t3t-1",
                        code: "3T3",
                        display: "Third of patient top 3 things"
                    }]
                },
                text: {
                    status: "generated",
                    div: topThreeThings.description3 || null
                }
            }
        ]
    }

    return transformed;
}

module.exports = topThreeThingsTransformation;