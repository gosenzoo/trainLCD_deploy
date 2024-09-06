FROM node:latest

# 作業ディレクトリ
WORKDIR /var/www
#COPY .env ../

# ロケールのインストールと設定
RUN apt-get update
RUN apt install -y locales && \
    localedef -f UTF-8 -i ja_JP ja_JP.UTF-8
ENV LANG ja_JP.UTF-8
ENV LANGUAGE ja_JP:ja
ENV LC_ALL ja_JP.UTF-8
ENV TZ JST-9
ENV TERM xterm

# Vimインストール
RUN apt install -y vim

# パッケージをインストール
COPY lcd/lcd-app/ ./
RUN ls
RUN npm install -g npm@latest
RUN npm install promise-mysql dotenv
