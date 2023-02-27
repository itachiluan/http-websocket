import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer, Socket } from "socket.io";

class QueueErr extends Error {}

const app = express();
app.use(express.json());

const httpServer = createHttpServer(app);
const wsServer = new SocketIOServer(httpServer);

let singleSocket: Socket | null;
wsServer.on("close", () => {
    singleSocket = null;
    console.log("closed");
});

wsServer.on("connection", (socket) => {
    singleSocket = socket;
    console.log("connected");
});

wsServer.on("error", (err) => {
    singleSocket = null;
    console.log("error", err);
});

async function send_task(task: Task): Promise<TaskResponse> {
    return new Promise((resolve, reject) => {
        const timeout = 5000;

        const timeoutId = setTimeout(() => {
            reject(new QueueErr("Timeout"));
            singleSocket = null;
        }, timeout);

        if (!singleSocket) {
            reject(new QueueErr("No socket"));
            return;
        }

        singleSocket.emit("request", task, (response: TaskResponse) => {
            clearTimeout(timeoutId);
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
        res.status(500).send({ err: 'socket err' });
    }

});

const PORT = process.env.PORT || 3100;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
