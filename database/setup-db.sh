#!/bin/bash

# DB credentials are passed as environment variables: USER, MYSQL_PWD, MYSQL_HOST, MYSQL_TCP_PORT
# the password for MS databases is passed as environment variable: MS_DB_PASSWORD

exit_error() {
    local ERROR_CODE=$? # save the exit code as the first thing done in the trap function
    
    echo ""
    echo "The script failed - the command executing at the time of the error (${ERROR_CODE}) was:"
    echo "$BASH_COMMAND"
    echo "on line ${BASH_LINENO[0]}"
    exit $ERROR_CODE
}

run_sql() {
	mysql -v -e "$1"
}

create_ms_database_and_user() {
    local NAME="$1"

    echo "creating database ${NAME} with user ${NAME}"

    run_sql "CREATE DATABASE IF NOT EXISTS \`${NAME}\`;"
    run_sql "CREATE USER IF NOT EXISTS '${NAME}'@'%';"
    run_sql "ALTER USER '${NAME}'@'%' IDENTIFIED BY '${MS_DB_PASSWORD}';"
    run_sql "GRANT ALL PRIVILEGES ON \`${NAME}\`.* To '${NAME}'@'%';"
}

wait_for_db() {
    echo "waiting for DB to be available: ${MYSQL_HOST}:${MYSQL_TCP_PORT}"
    local TIMEOUT=120

    while ! run_sql "SELECT 1"; do
        (( COUNTER++ ))
        if [[ "${COUNTER}" -gt "${TIMEOUT}" ]]; then
            echo "Exhausted after ${TIMEOUT} seconds to wait for DB - Aborting"
            exit 1
        fi
        sleep 2
    done

    echo "DB was responsive - continue"
    echo
}

############################################

trap exit_error ERR

wait_for_db

create_ms_database_and_user "ms-auth"
create_ms_database_and_user "ms-catalog"
create_ms_database_and_user "ms-settings"

echo "finished setup DB"
