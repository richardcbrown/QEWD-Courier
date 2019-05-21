
const { signed } = require('../../lib/test');

module.exports = function(args, finished) { 
  console.log("INDEX")

  console.log(signed())

  var validJWT;
  var authenticated = false;

  if (args.req.headers.authorization) {
    var fin = function(obj) {
      // dummy function to allow us to validate the JWT without finishing
      //  the replacement function simply logs any JWT errors to the console / log
      console.log('JWT Authorization header error:');
      console.log(JSON.stringify(obj));
    };

    authenticated = this.jwt.handlers.validateRestRequest.call(this, args.req, fin, true, true);
    console.log('*** validJWT = ' + validJWT);
  }


  return finished({ ok: true, authenticated });
}
