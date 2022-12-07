# Staged & Production environment deploy

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

### Create or place exsiting SSL certificate files 
Path: /git/atlantis/cert/nginx

Names: crt.crt, key.key

<a href="https://www.digitalocean.com/community/tutorials/how-to-create-a-self-signed-ssl-certificate-for-apache-in-ubuntu-20-04" target="_blank">How to create self signed SSL Certificate</a>

Alternatively, ignore the link, change directory to /git/atlantis and:
```
  mkdir cert
  cd cert
  mkdir nginx
  cd nginx
  sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.key -out crt.crt
```
###  Generate JWT private key and public certificate:
  ```
  cd .. (go to /git/atlantis/cert/)
  mkdir jwt
  cd jwt
  openssl genrsa -out jwt.key 2048
  openssl rsa -in jwt.key -outform PEM -pubout -out jwt.crt
  ```


### For some of the REST calls (prefixed with "/notification") we inject a JWT since we didn't have the time to update the clients to send it (when we added the SSO feature).
The relevant code:
![image](https://user-images.githubusercontent.com/83502821/189596376-c5bbd9b6-ea7d-4b70-982b-d3f7086801c1.png)


####  Generate JWT token:
<a href="https://dinochiesa.github.io/jwt/" target="_blank">> Create Jwt token </a>
##### Use previous ssl keys, and certified credentials of an adnim user that exists in your ms-auth db
```
    {
      "alg": "RS256",
      "typ": "JWT"
    }

    {
      "userId": "<uuid>",
      "tenantId": "<uuid>",
      "roles": [
        "Admin"
      ],
      "iat": <issueTime>,
      "iss": "ms-auth",
      "sub": "<uuid>"
    }
```

### Replace configuration files
#### Use your ssl & jwt certifications, and your jwt token, generated in previous steps as the valurs for the corresponding fields 

Templates are found under \git\atlantis\resources\templates. Create your own copies, fill your data, and replace with:

(1) ./shared/src/globalConfig.ts

(2) ./resources/initializeSettingsDBEntetis.json
###  Create environment variables file in root according to docs/environment-file.md called `.env-staged.env` or `.env-prod.env`
#### Example:
```
DB_HOST=db
DB_PORT=3306
DB_PASS=dev
DB_ADMIN_USER=root
DB_ADMIN_PASS=dev
REDIS_HOST=redis
REDIS_PORT=6379
LOG_LEVEL=info
DISABLE_CACHE=false
WEB_BASE_URL=https://10.10.20.20:7443
PORT_EXPOSE_NGINX_HTTP=8080
PORT_EXPOSE_NGINX_HTTPS=7443
PORT_EXPOSE_MYSQL=3307
PORT_EXPOSE_REDIS=6380
DB_PERSISTENCE_HOST_VOLUME=./db-staged
```

###  From root, run deploy as staged/prod enviorment
* If you need: add execution privilege the current owner user of cicd.sh
 ```
chmod u+x cicd.sh
 ```
 ####  Run cicd
 #####  staged
```
 /git/atlantis/cicd.sh --type staged --action deploy
```
 #####  or production
```
 /git/atlantis/cicd.sh --type prod --action deploy
```
The GUI will be available in browser at

  staged:  https://localhost:7443/

  production:  https://localhost/

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
