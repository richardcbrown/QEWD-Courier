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

class CarePlanSaverService {
    async saveCarePlan(patientId, careplanResources, forward, jwt) {

        try {
            const patientApiRequest = {
                path: `/api/fhir/patient/${patientId}`,
                method: 'GET'
            };

            const result = await forwardPromise(patientApiRequest, forward, jwt);

            console.log('CarePlanSaverService|saveCarePlan|getPatient|complete');

            const patientResult = result.resources;

            console.log('CarePlanSaverService|saveCarePlan|getPatientCareplan');

            const careplanApiRequest = {
                path: `/api/fhirstore/CarePlan?patient=Patient/${patientResult.resource.id}`,
                method: 'GET'
            };

            const careplanBundle = await forwardPromise(careplanApiRequest, forward, jwt);

            console.log(careplanBundle)

            console.log('CarePlanSaverService|saveCarePlan|getPatientCareplan|complete');

            const careplanResource = (careplanBundle.entry && careplanBundle.entry.find((entry) => entry.resource.resourceType === 'CarePlan')) || null;

            if (!careplanResource) {
                return null
            }

            const careplan = careplanResource.resource;

            careplan.contained = careplanResources;

            console.log('CarePlanSaverService|saveCarePlan|putPatientCareplan|start');

            const careplanSaveApiRequest = {
                path: `/api/fhirstore/CarePlan/${careplan.id}`,
                method: "PUT",
                body: careplan
            }

            await forwardPromise(careplanSaveApiRequest, forward, jwt);

            console.log('CarePlanSaverService|saveCarePlan|putPatientCareplan|end');
        } catch (error) {
            console.log('CarePlanSaverService|saveCarePlan|error');
            console.log(error)
        }

        console.log('CarePlanSaverService|saveCarePlan|end');
    }
}

module.exports = CarePlanSaverService;