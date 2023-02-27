import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer, Socket } from "socket.io";

class QueueErr extends Error {}

const app = express();
app.use(express.json());

const httpServer = createHttpServer(app);
const wsServer = new SocketIOServer(httpServer);

let singleSocket: Socket | null;
let socketOK = false;
wsServer.on("close", () => {
    socketOK = false;
    singleSocket = null;
    console.log("closed");
});

wsServer.on("connection", (socket) => {
    socketOK = true;
    singleSocket = socket;
    console.log("connected");
});

async function send_task(task: Task): Promise<TaskResponse> {
    return new Promise((resolve, reject) => {
        if (!singleSocket) {
            reject(new QueueErr("No socket"));
            return;
        }

        singleSocket.emit("request", task, (response: TaskResponse) => {
            resolve(response);
        });
    });
}

interface Task {
    foo: string;
}

interface TaskResponse {
    statusCode: number;
    body: string;
}


app.get('/', (req, res) => {
    res.send('Hello World from ts!');
});

app.get('/test', async (req, res) => {

    try {
        const result = await send_task({ foo: "bar" });
        res.send(result);

    } catch (err) {
        console.log(err);
        res.status(500).send({ err: 'no Socket' });
    }

});

const PORT = process.env.PORT || 3100;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
