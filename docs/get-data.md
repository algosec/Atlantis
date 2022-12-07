### For a version's first time:
```
Create a team in teams 

Manually connect to your application db and in ms-catalog :

Add the team to external entity table
Add the team to teams table

1- main channel

2- garbage channel. (teams is limited to 200 channels so after we reach maximum channesl, it will be sent to this channel with no separation).
```
### Atlantis will listen to the following @post requests:

   ```
@POST api/v1/notification/allure

Body template:
{
  "jobName" : "v<version number>-CI-<CI number>-<component>-<name>",
  "team" : "<version number>",
  "build" : "<automation Branch>.<build number>",
  "url" : "http://<host ip>/jobs/<jobName>/35/allure-report/",
  "branch" : "<branch name>",
  "passed" : <number of passed tests>,
  "skipped" : <number of skipped tests>,
  "skippedByUser" : <number of skipped by user tests>,
  "failed" : <number of failedtests> ,
  "failedTests" : [ <names of failed tests> ],
  "metaData" : {
    "applianceBuild" : "<automation Branch>.<appliance build number>", // optional
    "automationBranch" : "v<automation Branch>"
  }
}

Body example:

  {
    "jobName" : "v1000.10.0-CI-3-ComponentName-Validation-Azure",
    "team" : "3200.60",
    "build" : "136",
    "url" : "http://10.20.123.123/jobs/v1000.10.0-CI-3-ComponentName-Validation-Azure/35/allure-report/",
    "branch" : "EilonBranch",
    "passed" : 15,
    "skipped" : 0,
    "skippedByUser" : 2,
    "failed" : 2 ,
    "failedTests" : [ "MyNameOfFailedTest1","MyNameOfFailedTest2"  ],
    "metaData" : {
        "applianceBuild" : "1000.10.0.30",
        "automationBranch" : "v1000.10.0"
      }
}

Example for responses: 

status 400
Skipping notification - Request missing the following fields: skipped

Status 400 
Skipping notification - no team was found for version '3200.60'

status 200
Received without posting to Teams - failed to send post card for channel '7c72652e-6049-4c75-b763-78f0b328a723' in team
'7c72652e-6049-4c75-b763-78f0b328a723': The sender with objectId '45bb6f19-3e18-4980-8f81-4a90d5439ea8' is not a member
or an owner of the team.

Status 401
Unauthorized 
   ```
   
### Note the process logic, and adjust if necessary: 
   You can find it in ms-catalog/src/controllers/actions/notification-allure.ts
   
   Please rewrite it to fit your needs
  ![image](https://user-images.githubusercontent.com/83502821/189647872-70038edd-c216-42ed-b76d-7db5807c5e9d.png)

