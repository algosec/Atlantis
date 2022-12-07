########################
## DB provision
########################
FROM mysql:8.0 AS db-provision

WORKDIR /provision

RUN microdnf install yum
RUN yum install -y nc wget dos2unix

COPY setup-db.sh .
RUN chmod +x setup-db.sh && \
	dos2unix setup-db.sh

CMD bash setup-db.sh


########################
## Flyway - ms-catalog
########################
FROM flyway/flyway:7.5-alpine AS flyway-ms-catalog
COPY flyway/ms-catalog /flyway/sql


########################
## Flyway - ms-auth
########################
FROM flyway/flyway:7.5-alpine AS flyway-ms-auth
COPY flyway/ms-auth /flyway/sql


########################
## Flyway - ms-settings
########################
FROM flyway/flyway:7.5-alpine AS flyway-ms-settings
COPY flyway/ms-settings /flyway/sql
