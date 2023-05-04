# Development environment deploy

### 1. Start with a clean Ubuntu machine. Suggested spec:
 ```
4 cpu, 16GB ram, 100gb
 ```
### 2. Clone Atlantis repo to your local machine
 
### 3. Install and start docker-compose
 ```
sudo apt install docker-compose
sudo service docker start
 ```
### 4. Install Node.js
 ```
sudo apt-get update
sudo apt install curl
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt install -y nodejs
 ```
### 5. From Atlantis directory, install npm
 ```
npm install
 ```
### 6. From root direcrory, Install python3
 ```
sudo apt update
sudo apt install python3-pip
 ```
### 6. From Atlantis/resources Install mysql-connector
 ```
sudo python3 -m pip install mysql-connector
sudo pip install mysql-connector-python
 ```
### 7. Create dev-env file in root
 ```
 File name should be .env-dev-db.env and write to it DISABLE_CACHE=true
 ```
### 8. Create your own configuration files
#### Templates are found under \git\atlantis\resources\templates. Create your own copies, fill your data, and replace with:

 ```
(1) ./shared/src/globalConfig.ts

(2) ./resources/initializeSettingsDBEntetis.json
 ```

### 9. Prepare the DB
    * Run local database & redis `./cicd.sh --type dev-db --action deploy` (action ps to check status)
    * Database GUI (adminer) - http://localhost:8080/?server=db&username=root  
      * user: **root**  
      * pass: **dev**

### 10. Run microservices, from seperated terminals 
####  ms-auth. The micro-service will be available at http://localhost:3001/ping
 ```
npm run dev:start-ms-auth
```
#### ms-settings. The micro-service will be available at http://localhost:3002/ping
```
npm run dev:start-ms-settings
``` 
####  ms-catalog. The micro-service will be available at http://localhost:3003/ping
```
npm run dev:start-ms-catalog
```
#### Web GUI. The GUI will be available in browser at http://localhost:4200
```
npm run dev:start-web
```
## Further steps:

### 11. Initialize settings db
```
from /Atlantis/resources/ directory
python3 ./InitialSettingsDB.py
```
### 12. For local login, insert users to db:
```
Manually connect to your db using the credentials written in the enviorment file, and in ms-auth db:

Add a user entity to users table, with the password hashed with sha256, base64 (you can use <a href="https://approsto.com/sha-generator/" target="_blank">Online Generator </a>) and add '=' at the end

For example, the password 123456789 should enter as FeKw08M4keuw8e9gnsQZQgwg4yDOlMZfvIwzEkSOsiU=
```

### 13. For SSO login
```
SSO login will be initiated using the sso credentials and details you give to entity with key = "sso", in ./resources/initializeSettingsDBEntetis.json
```

## You're all set! The next step is to import some data and get the flow going
