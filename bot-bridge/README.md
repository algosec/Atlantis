### Background
This is a bot bridge that run on AWS lambada, and it's purpose it to be public endpoint that Microsoft teams trigger on dedicated event (outgoing webhook).
It's a Node.js lambada that runs the *handler.js* file, which validate the authenticity of the event, and it it's valid it calls a backend server ```https://status-automation.algosec.com``` for performing the business logic

### In order to deploy this lambada
* create new directory (outside of this project)
* ```cd``` to the new directory  
* copy the ```handler.js``` to the new directory
* run ```npm install --production request```
* zip the folder and call it ```bot-bridge.zip```
* upload it via AWS lambada GUI (should be done by DevOps)
  * The environment variable `TEAMS_SECRETS` should be set with the following format (see `dev-server.js` for example):
  ```
   {
        "<version>": "<secret>",
        "<version>": "<secret>",
   }
   ```