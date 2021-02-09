# shoppinglist - Simple Shared Shopping List Web Application

## Development

The backend currently uses PHP for easy deployment on cheap shared web servers.
The frontend uses vanilla JavaScript without any external dependencies or third-party libraries.

### Setup Dev Environment

In order to develop and test, we need a local PHP server.
Either setup a "real" web server like apache or nginx, or use the integrated server in PHP:

- Check if PHP is already on your system: ```php -v``` (The version should be at lease 7)
  - Install PHP (CLI) if needed, see https://www.php.net/manual/en/install.php
- In the project directory, execute: ```php -S 0.0.0.0:8888 dev/router.php```
- Open your favorite browser: http://localhost:8888/

### Troubleshooting

#### My Access Code Does Not Work

see below

#### Changes are not persisted, moving an item between active and inactive list triggers error

Make sure the file `backend/data/list-[CODE].json` ("[CODE]" replaced with the access code) exists and is readable and
writable by the user the webserver runs under. This is usually your user in development and another user (like "http"
or "www-data") when installed on a shared server.
