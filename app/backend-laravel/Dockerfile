FROM php:8.3-cli
RUN apt-get update && apt-get install -y git unzip rsync libzip-dev && rm -rf /var/lib/apt/lists/* \
 && docker-php-ext-install pdo_mysql zip
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY . /overlay
# Normalise line endings (Windows checkouts) and run through bash, so a lost executable bit does not matter
RUN sed -i 's/\r$//' /overlay/setup.sh /overlay/entrypoint.sh && bash /overlay/setup.sh /app
WORKDIR /app
EXPOSE 8000
ENTRYPOINT ["bash", "/app/entrypoint.sh"]
