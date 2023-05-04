# Atlantis
How do you manage the automation in your organizaion?

Do you wish for a detailed nice looking report at the end of each build?

Do you wish for to compare your builds easily? 

Do you wish for an automated tool to compute your success rates before you move your code to production?



You're in the right place!

Atlantis will help you manage your automation builds and will save you precious time ⌛

All you need to do is follow the deployment instructions, and you're there 🔥

Atlantis is designed to streamline and optimize test automation results within an organization, saving time and resources.
Some of the features included in Atlantis

The ability to monitor huge amount of tests running on every build / nightly,
Compare build results to quickly find new failures
Compute success rates
Send results by emails
link Jira bugs to tests and more...

All accessible through a user-friendly interface.

Here's a little peek:
[![atlantis2.png](https://i.postimg.cc/9MywCndw/atlantis2.png)](https://postimg.cc/wyTjkFb9)


**General**

This is a HTTP server has 2 purposes:
1. Web-application (Angular) for automation status
2. Gateway to publish notification to CI-3 Team in Microsoft Teams.
In order to inform the relevant team members about your final CI results, we have set up a gateway to publish notifications to a Microsoft Teams channel. The gateway will automatically send notifications to the Teams channel you have configured, so that all relevant stakeholders can stay informed and take action if necessary.

# Topology
![image](https://user-images.githubusercontent.com/83502821/189111684-bf3caa34-c30e-4f09-9a14-835b09d87ece.png)


# Deployment

### Dev deploy
Available under  [docs/dev-deploy.md](https://github.com/algosec/Atlantis/blob/main/docs/dev-deploy.md)

### Staged & Production Deploy
  Available under [docs/staged & prod -deploy.md](https://github.com/algosec/Atlantis/blob/main/docs/staged%20%26%20prod%20-deploy.md)
  
  
# About automated external processes 
 Available under [docs/email and teams integrations.md](https://github.com/algosec/Atlantis/blob/main/docs/email%20and%20teams%20integrations.md)

  
# Get Data
  Explained under [docs/get-data.md ](https://github.com/algosec/Atlantis/blob/main/docs/get-data.md)
  

