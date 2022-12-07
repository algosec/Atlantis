#!/bin/bash
set -E

cd "$(dirname "$0")"

PROFILE_NAME_PROD="sa-prod"
PROFILE_NAME_STAGED="sa-staged"
PROFILE_NAME_DEV_DB="sa-dev-db"

DOCKER_COMPOSE_CMD_PROD="docker-compose -p ${PROFILE_NAME_PROD} -f docker-compose.yml --env-file .env-prod.env"
DOCKER_COMPOSE_CMD_STAGED="docker-compose -p ${PROFILE_NAME_STAGED} -f docker-compose.yml --env-file .env-staged.env"
DOCKER_COMPOSE_CMD_DEV_DB="docker-compose -p ${PROFILE_NAME_DEV_DB} -f docker-compose.dev-db.yml --env-file .env-dev-db.env"

TYPE=
SKIP_BUILD=

########################################

validate_git_exists() {
  if ! command -v git &> /dev/null; then
    echo "Error: no git was found"
    exit 1
  fi
}

validate_inside_git_repo() {
  if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Error: not inside git repository"
    exit 1
  fi
}

has_git_changes() {
  ! git diff --exit-code -s
}

is_on_master_branch() {
  [ "$(git rev-parse --abbrev-ref HEAD)" == "master" ]
}

action_deploy() {
  if [ "${TYPE}" == "prod" ] && ( ! is_on_master_branch || has_git_changes ); then
    echo "Error: deploy to production must be from master branch with no git changed - please build from master branch without changes"
    exit 1
  fi

  echo "Going to deploy ${TYPE} environment"

  # sanity check to make sure all environment variables that were defined
  # in docker compose yml files are provided by the environment file
  if action_config 2>&1 | grep -i 'variable is not set'; then
      echo "Error: Can't deploy since the above variables are missing for ${TYPE} environment"
      exit 1
  fi

  if [ -z "${SKIP_BUILD}" ]; then
    echo
    echo "Building image"
    action_build
  fi

  echo
  echo "Start ${TYPE} environment:"
  ${DOCKER_COMPOSE_CMD} up -d --no-build --remove-orphans

  # remove staged container (if prod is deployed, there is no need to keep the staged environment)
  if [ "${TYPE}" == "prod" ]; then
    echo
    echo "Delete staged environment"
    ${DOCKER_COMPOSE_CMD_STAGED} down
  fi

  echo
  action_ps

  echo
  echo "---------------------------"
  echo
  echo -n "Done! "
  case $TYPE in
    prod) echo "Browse to PROD environment: https://<your host ip>/" ;;
    staged) echo "Browse to STAGED environment: https://<your host ip>:7443/" ;;
    dev-db) echo "Browse to DB adminer environment: http://localhost:8080/ and Redis GUI: http://localhost:8085" ;;
    *) print_usage_run ; echo ; echo "Error: unknown type parameter '$TYPE'" ; exit 1 ;;
  esac
}

action_build() {
    local BUILD_DESCRIPTION=$(calculate_build_description)
    ${DOCKER_COMPOSE_CMD} build --build-arg BUILD_DESCRIPTION="${BUILD_DESCRIPTION}"
}

action_ps () {
    echo "Environment ${TYPE} status:"
    ${DOCKER_COMPOSE_CMD} ps
}

action_config () {
    echo "Environment ${TYPE} config:"
    ${DOCKER_COMPOSE_CMD} config
}

action_remove() {
    # for production - prompt before executing the remove
    if [ "${PROFILE_NAME}" == "${PROFILE_NAME_PROD}" ]; then
      if ! confirm "Are you sure you want to remove the production server"; then
        echo "Aborting."
        exit 0
      fi
    fi

    echo "Removing ${TYPE} environment"
    ${DOCKER_COMPOSE_CMD} down
}

action_stop() {
    # for production - prompt before executing the remove
    if [ "${PROFILE_NAME}" == "${PROFILE_NAME_PROD}" ]; then
      if ! confirm "Are you sure you want to stop the production server"; then
        echo "Aborting."
        exit 0
      fi
    fi

    echo "Stopping ${TYPE} environment"
    ${DOCKER_COMPOSE_CMD} stop
}

action_start() {
    # for production - prompt before executing the remove
    if [ "${PROFILE_NAME}" == "${PROFILE_NAME_PROD}" ]; then
      if ! confirm "Are you sure you want to start the production server"; then
        echo "Aborting."
        exit 0
      fi
    fi

    echo "Starting ${TYPE} environment"
    ${DOCKER_COMPOSE_CMD} start
}

action_logs() {
    ${DOCKER_COMPOSE_CMD} logs -f || true
}

action_backup() {
  local TARGET_DIR="db-backup"
  local BACKUP_NAME="${PROFILE_NAME}--backup--$(date +%d-%m-%y--%H-%M-%S)"
  local TMP_DIR="${TARGET_DIR}/${BACKUP_NAME}"

  echo "Going to backup '${PROFILE_NAME}'"

  mkdir -p "${TMP_DIR}"

  export_db_variables

  # iterate over all databases that starts with 'ms-' and backup them
  for DB_NAME in $(list_databases); do
      echo "Going to backup database '${DB_NAME}'"
      run_mysql_with_admin_credentials mysqldump "${DB_NAME}" > ${TMP_DIR}/${DB_NAME}.sql
      local RC="$?"

      if [ "${RC}" != "0" ]; then
        echo "Error: failed to create backup for ${DB_NAME} (${RC}):"
        cat "${TMP_DIR}/${DB_NAME}.sql" # the file contains the error
        rm -rf "${TMP_DIR}" # make sure no leftovers...
        exit 1
      fi
  done

  local TARGET_FILE="${TARGET_DIR}/${BACKUP_NAME}.tgz";
  tar -czf "${TARGET_FILE}" -C "${TMP_DIR}" .

  rm -rf "${TMP_DIR}"

  echo
  echo "Done:"
  ls -lah "$(pwd)/${TARGET_FILE}"
}

action_restore() {
  local BACKUP_FILE="$1"

  if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: backup file '${BACKUP_FILE}' does not exist - aborting restore"
    exit 1
  fi

  echo "Going to restore to '${PROFILE_NAME}' from backup file '${BACKUP_FILE}'"
  echo

  # for production - prompt before executing the restore
  if [ "${PROFILE_NAME}" == "${PROFILE_NAME_PROD}" ]; then
    echo
    echo "You are going to restore a backup to production server - exising data will be permanently lost!"
    if ! confirm "Are you sure you want to restore a backup to production server"; then
      echo "Aborting."
      exit 0
    fi
  fi

  local TMP_DIR
  TMP_DIR=$(mktemp -d)

  export_db_variables

  echo "Extract backup files"
  tar -xzf "${BACKUP_FILE}" -C "${TMP_DIR}"


  # iterate over all databases that starts with 'ms-' and drop them
  for DB_NAME in $(list_databases); do
      echo "Dropping database '${DB_NAME}' ..."
      run_mysql_with_admin_credentials mysql -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`"
  done

  # iterate over all backup sql files of databases that starts with 'ms-', and restore them
  for DB_NAME in $(find "${TMP_DIR}" -name 'ms-*.sql' -type f -exec basename {} .sql \;); do
      echo "Restoring backup of '${DB_NAME}' ..."
      run_mysql_with_admin_credentials mysql -e "CREATE DATABASE \`${DB_NAME}\`"
      run_mysql "" "${DB_PASS:-dev}" mysql -u "${DB_NAME}" -D "${DB_NAME}" < "${TMP_DIR}/${DB_NAME}.sql"
  done

  rm -rf "${TMP_DIR}"

  echo
  echo "Done"
}

list_databases() {
  # the "true" at the end is in order to ignore the error of the grep if nothing was found
  run_mysql_with_admin_credentials mysql -e 'show databases' | grep 'ms-' || true
}

export_db_variables() {
  # read environment for db parameters from the environment file
  local ENVIRONMENT_FILE=".env-${TYPE}.env"
  if [ -f "${ENVIRONMENT_FILE}" ]; then
    source "${ENVIRONMENT_FILE}"
  fi
}

run_mysql_with_admin_credentials() {
    run_mysql "${DB_ADMIN_USER:-root}" "${DB_ADMIN_PASS:-dev}" "$@"
}

run_mysql() {
    local USER="$1"
    local PASS="$2"
    shift 2

    docker exec \
        -i \
        -e "MYSQL_HOST=${DB_HOST:-localhost}" \
        -e "MYSQL_TCP_PORT=${DB_PORT:-3306}" \
        -e "MYSQL_PWD=${PASS}" \
        $([ -n "${USER}" ] && echo "-e \"MYSQL_USER=${USER}\"") \
        "${PROFILE_NAME}_db_1" \
        "$@"
}

calculate_build_description() {
  local CURRENT_COMMIT_SHA1=$(git rev-parse --short HEAD)
  local CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

  local BUILD_DESCRIPTION="${CURRENT_COMMIT_SHA1}-${CURRENT_BRANCH}"

  if has_git_changes; then
    BUILD_DESCRIPTION="${BUILD_DESCRIPTION}-dirty"
  fi

  echo "${BUILD_DESCRIPTION}"
}

confirm() {
	local PROMPT="$1"

    while read -p "${PROMPT}? (y/n): " USER_INPUT && [[ $USER_INPUT != "y" && $USER_INPUT != "n" ]] ; do
        echo "Please choose a valid option"
        echo
    done

	[ "${USER_INPUT}" == "y" ]
}

print_usage_run() {
    echo
    echo "Usage: deploy.sh --type <prod|staged|dev-db> --action <ps|build|deploy|remove|start|stop|config|logs|backup>"
    echo
    echo "Options:"
    echo "  --skip-build                 Skip docker image build"
}

exit_error() {
    local FAILURE_LINE="$1"
    echo
    echo "An error occured (line ${FAILURE_LINE})"
	  exit 1
}

########################################

trap 'exit_error $LINENO' ERR

validate_git_exists
validate_inside_git_repo

if [ -z "$*" ]; then
    print_usage_run
    exit 1
fi

getopt --long help,type:,action:,skip-build -- "$@" > /dev/null || true

while true; do
    case $1 in
        --help) print_usage_run; exit 0 ;;
        --type) TYPE=$2; shift ;;
        --action) ACTION=$2; shift ;;
        --skip-build) SKIP_BUILD=1 ;;
        *) break ;;
    esac
    shift
done

case $TYPE in
    prod) DOCKER_COMPOSE_CMD="${DOCKER_COMPOSE_CMD_PROD}" ; PROFILE_NAME="${PROFILE_NAME_PROD}" ;;
    staged) DOCKER_COMPOSE_CMD="${DOCKER_COMPOSE_CMD_STAGED}" ; PROFILE_NAME="${PROFILE_NAME_STAGED}" ;;
    dev-db) DOCKER_COMPOSE_CMD="${DOCKER_COMPOSE_CMD_DEV_DB}" ; PROFILE_NAME="${PROFILE_NAME_DEV_DB}" ;;
    *) print_usage_run ; echo ; echo "Error: unknown type parameter '$TYPE'" ; exit 1 ;;
esac

case $ACTION in
    build) action_build $@ ;;
    deploy) action_deploy $@ ;;
    stop) action_stop $@ ;;
    start) action_start $@ ;;
    remove) action_remove $@ ;;
    logs) action_logs $@ ;;
    config) action_config $@ ;;
    ps) action_ps $@ ;;
    backup) action_backup $@ ;;
    restore) action_restore $@ ;;
    *) print_usage_run ; echo ; echo "Error: unknown action parameter '$ACTION'" ; exit 1 ;;
esac