FROM redis:5.0.7
ENV TZ=Asia/Shanghai
ENV LANG zh_CN.utf8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
