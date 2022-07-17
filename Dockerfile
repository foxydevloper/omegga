FROM node:16.16-buster

# Brickadia dependencies
WORKDIR /setup
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y apt-utils libdbus-1-3 libegl1 libgl1 libglvnd0 libglx0 \
  libx11-xcb1 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-randr0 \
  libxcb-render-util0 libxcb-shape0 libxcb-sync1 libxcb-util0 libxcb-xfixes0 \
  libxcb-xkb1 libxkbcommon-x11-0 libxkbcommon0 xdg-user-dirs sudo
RUN wget http://mirrors.edge.kernel.org/ubuntu/pool/main/g/gcc-10/gcc-10-base_10-20200411-0ubuntu1_amd64.deb
RUN wget http://mirrors.xmission.com/ubuntu/pool/main/g/gcc-10/libgcc-s1_10-20200411-0ubuntu1_amd64.deb
RUN dpkg -i ./gcc-10-base_10-20200411-0ubuntu1_amd64.deb
RUN dpkg -i ./libgcc-s1_10-20200411-0ubuntu1_amd64.deb
RUN rm ./gcc-10-base_10-20200411-0ubuntu1_amd64.deb
RUN rm ./libgcc-s1_10-20200411-0ubuntu1_amd64.deb

# Install brickadia
RUN wget https://static.brickadia.com/launcher/1.5/brickadia-launcher.deb
RUN apt-get install ./brickadia-launcher.deb
RUN rm ./brickadia-launcher.deb

WORKDIR /src
COPY package.json /src
RUN npm i
COPY webpack.config.js /src
COPY tools /src/tools
COPY templates /src/templates
COPY frontend /src/frontend
COPY src /src/src
COPY bin /src/bin
RUN npm link
RUN npm run dist

# Setup server and home dir
RUN mkdir /root/.config
RUN mkdir -p /root/.local/share/brickadia-launcher/brickadia-installs
ENV XDG_CONFIG_HOME="/root/.config"

WORKDIR /root/server

ENTRYPOINT ["omegga"]