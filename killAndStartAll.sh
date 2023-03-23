sudo kill -9 `sudo lsof -t -i:8080`

bash startServer.sh &
bash startWorker.sh