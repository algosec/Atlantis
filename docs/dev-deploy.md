# Development environment deploy

### Start with a clean Ubuntu machine. Suggested spec:
```
4 cpu
16GB ram
100gb
```

### Create ssh trust to your github account
 ```
cd .ssh
ssh-keygen
cat id_rsa.pub
 ```
### Copy the file content and paste it in Github -> settings --> SSH and GPG keys --> New SSH key
![image](https://user-images.githubusercontent.com/83502821/189590974-fb386731-f966-4a55-8ba6-0fcac4f73a08.png) ![image](https://user-images.githubusercontent.com/83502821/189590764-1b984b18-de87-4eec-8989-64e3e4dcb8bd.png)

### Clone the repository to git/
```
cd ..
mkdir git
cd git
git clone git@github.com:algosec/atlantis.git
 ```
### Install docker-compose
 ```
cd ..
sudo apt install docker-compose
 ```
### Start docker
 ```
sudo service docker start
 ```
### For nodejs
 ```
sudo apt-get update
sudo apt install curl
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
sudo apt install -y nodejs
 ```
### For npm, from git/atlantis directory 
 ```
cd git/atlantis
npm install
 ```
### Install python3
 ```
cd ..
cd ..
sudo apt update
sudo apt install python3-pip
cd git/atlantis/resources
sudo python3 -m pip install mysql-connector
sudo pip install mysql-connector-python
 ```

### Replace configuration files

Templates are found under \git\atlantis\resources\templates. Create your own copies, fill your data, and replace with:

(1) ./shared/src/globalConfig.ts

(2) ./resources/initializeSettingsDBEntetis.json

### Create a file in root called `dev-db.env` and write to it `DISABLE_CACHE=true`

### Prepare DB
    * Run local database & redis `./cicd.sh --type dev-db --action deploy` (action ps to check status)
    * Database GUI (adminer) - http://localhost:8080/?server=db&username=root  
      * user: **root**  
      * pass: **dev**

### Run microservices, from seperated terminals 
   * ms-auth  
      #### Run npm script `dev:start-ms-auth`  
        ```
        npm run dev:start-ms-auth
        ```
      * The micro-service will be available at http://localhost:3001/ping
   * ms-settings  
      #### Run npm script `dev:start-ms-settings`  
        ```
        npm run dev:start-ms-settings
        ```     
      * The micro-service will be available at http://localhost:3002/ping
   * ms-catalog
        #### Run npm script `dev:start-ms-catalog`
        ```
        npm run dev:start-ms-catalog
        ```
       The GUI will be automatically opened in browser at http://localhost:4200
   * Web GUI
        #### Run npm script `dev:start-web`
        ```
        npm run dev:start-web
        ```
       The GUI will be available in browser at http://localhost:4200

# Further steps:

### Initialize settings db by running
 ```
python3 ./resources/InitialSettingsDB.py
 ```

### For local login, insert users to db:

Manually connect to your db using the credentials written in the enviorment file, and in ms-auth db:

Add a user entity to users table, with the password hashed with sha256, base64 (you can use <a href="https://approsto.com/sha-generator/" target="_blank">Online Generator </a>) and add '=' at the end

For example, the password 123456789 should enter as FeKw08M4keuw8e9gnsQZQgwg4yDOlMZfvIwzEkSOsiU=


### For SSO login, insert users to db:

SSO login will be initiated using the sso credentials and details you give to entity with key = "sso", in ./resources/initializeSettingsDBEntetis.json
