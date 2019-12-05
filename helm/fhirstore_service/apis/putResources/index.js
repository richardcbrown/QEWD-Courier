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

const request = require('request');

module.exports = function(args, finished) { 
  console.log("apis/putResources|start");

  console.log(args)

  const config = this.userDefined.serviceConfig;

  console.log(`${config.host}${args.resourceType}/${args.id}`)

  request({
    url: `${config.host}${args.resourceType}/${args.id}`,
    method: "PUT",
    json: args.req.body
  }, (err, response, body) => {

    console.log(JSON.parse(body))

    finished(JSON.parse(body));
  });

  console.log("apis/putResources|end");
}