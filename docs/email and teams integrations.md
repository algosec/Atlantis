## We use Microsoft's [Power Automate](https://powerautomate.microsoft.com/) for owr automated integrations with Microsoft Teams & Email Sending

### Create the following flows:

### (1) [[PROD]] Post message to a CI-3 Channel
##### Note: the user owining the worflows must be a member of a Microsoft team that posts messages into. Otherwise, it will fail to publish messages.
##### Use the URL (https://prod-....) in globalConfig -> teams -> postMessageURL
![PROD  Post message to a CI-3 Channel](https://user-images.githubusercontent.com/83502821/190111769-4ebee684-5eee-476c-a7c7-ffa6114c3ecb.jpg)

##### full json:
```
{
	"type": "object",
	"properties": {
		"targetTeamId": {
			"type": "string"
		},
		"targetChannelId": {
			"type": "string"
		},
		"message": {
			"type": "string"
		}
	}
}
```
### (2) [[PROD]] Publish email with PDF attachment
##### Use the URL (https://prod-....) in globalConfig -> enailDetails -> sendMessageURL
![PROD  Publish email with PDF attachment](https://user-images.githubusercontent.com/83502821/190111980-e05a601d-feda-41ed-aa44-56832ef5dd39.jpg)

##### full json:
```
{
	"type": "object",
	"properties": {
		"to": {
			"type": "string"
		},
		"subject": {
			"type": "string"
		},
		"body": {
			"type": "string"
		},
		"pdfName": {
			"type": "string"
		},
		"pdfContent": {
			"type": "string"
		}
	}
}
```
### (3) [[PROD]] Create CI-3 Channel
##### Use the URL (https://prod-....) in globalConfig -> teams -> creatChannelURL
![PROD  Create CI-3 Channel](https://user-images.githubusercontent.com/83502821/190112058-a6e1bf2e-7d0a-4890-a8c4-9eded5060b3a.jpg)

##### full json:
```
{
    "type": "object",
    "properties": {
        "targetTeam": {
            "type": "string"
        }
    }
}
```
