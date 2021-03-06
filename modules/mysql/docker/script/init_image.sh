#!/usr/bin/env bash

apt-get update -y && apt-get install -y \
    supervisor \
    net-tools \
    wget \
    procps

wget --no-check-certificate \
    -O "flyway.tar.gz" \
    "https://bintray.com/artifact/download/business/maven/flyway-commandline-$FLYWAY_VERSION-linux-x64.tar.gz"
tar -zxvf "flyway.tar.gz"  -C /opt/
ln -s "/opt/flyway-${FLYWAY_VERSION}" "/opt/flyway"

wget "http://central.maven.org/maven2/mysql/mysql-connector-java/5.1.38/mysql-connector-java-5.1.38.jar"
mv "mysql-connector-java-5.1.38.jar" "/opt/flyway/drivers"

mkdir -p /home/mysql

# append to my.cnf for logging:
printf '%s\n' \
    '[mysqld]' \
    'explicit_defaults_for_timestamp' \
    'log-error = /var/log/mysql/error.log' \
    'long_query_time = 1' \
    'slow_query_log = 1' \
    'slow_query_log_file = /var/log/mysql/slow-queries.log' \
    >> /etc/mysql/my.cnf
