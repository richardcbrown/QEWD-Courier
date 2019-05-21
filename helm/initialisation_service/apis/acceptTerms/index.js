module.exports = function(args, finished) { 

  console.log("INDEX.....")

  return finished({ consent: args.req.body });
}