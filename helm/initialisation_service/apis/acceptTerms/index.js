module.exports = function(args, finished) { 

  console.log('api/acceptTerms|invoke');

  return finished({ consent: args.req.body, patientId: args.session.nhsNumber });
}