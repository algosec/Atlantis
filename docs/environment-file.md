# Environment variables
The environment variables are stored in a `.env-<type>.env` file where `<type>` is `prod`/`staged`/`dev-db`.

Those files aren't tracked by git as it contains sensitive information (credentials and secrets). \
Therefore, it has to be manually created for each environment (either production or development).

Environment variable | Description | Default value (development)
--- | --- | --- 
DB_HOST | The database hostname | `localhost`
DB_PORT | The database port | `3306`
DB_PASS | The database username | `dev`
DB_ADMIN_USER | The database admin password | `root` 
DB_ADMIN_PASS | The database admin password | `dev`
--- | --- | ---
REDIS_HOST | The redis hostname | `localhost`
REDIS_PORT | The redis port | `6379`
DISABLE_CACHE | Boolean flag to disable cache | `false`
--- | --- | ---
LOG_LEVEL | Log level for micro-services (`debug`/`info`/`warn`/`error`) | `info`
--- | --- | ---
WEB_BASE_URL | The url of the web application | `http://localhost:4200`
PORT_EXPOSE_NGINX_HTTP | the exposed port of the nginx (http) | N/A
PORT_EXPOSE_NGINX_HTTPS | the exposed port of the nginx (https) | N/A
PORT_EXPOSE_MYSQL | the exposed port of MySQL database | `3306` 
PORT_EXPOSE_REDIS | the exposed port of Redis cache | `6379`
DB_PERSISTENCE_HOST_VOLUME | the directory of the host machine for DB persistence | `./db-dev1`
