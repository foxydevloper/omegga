rm -rf "test-server\data\Saved\Auth"
docker build .
docker run -p 7777:7777/udp -p 8080:8080 \
--mount type=bind,source="$(pwd)/brickadia-installs",target=/root/.local/share/brickadia-launcher/brickadia-installs \
--mount type=bind,source="$(pwd)/test-server",target=/root/server \
--env-file brickadia-credentials.env -it $(docker build -q .)