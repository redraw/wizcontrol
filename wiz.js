const { ipcMain, BrowserWindow } = require("electron");
const dgram = require("dgram");

const PORT = 38899;
const LIGHTS = {};

const onSocketError = (err) => {
  console.log(`socket error:\n${err.stack}`);
  socket.close();
};

const onSocketMessage = (msg, rinfo) => {
  console.log(`socket got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  const wins = BrowserWindow.getAllWindows();
  const data = JSON.parse(msg);
  if (data.method == "getPilot") {
    wins.forEach((win) =>
      win.webContents.send("status", { [rinfo.address]: data.result })
    );
  }
};

const sendMessage = (msg, ip) => {
  console.log(`socket send: ${msg}`);
  if (ip) {
    LIGHTS[ip].send(Buffer.from(msg), 0, msg.length);
  } else {
    Object.entries(LIGHTS).forEach(([ip, socket]) => {
      socket.send(Buffer.from(msg), 0, msg.length);
    });
  }
};

ipcMain.on("discover", () => {
  let pkt = 0;
  const server = dgram.createSocket("udp4");
  const discover = () => {
    console.log(`discovering broadcast pkt #${pkt}...`);
    msg = JSON.stringify({
      method: "registration",
      params: {
        phoneMac: "AAAAAAAAAAAA",
        phoneIp: "1.2.3.4",
        register: false,
        id: 1,
      },
    });
    server.send(Buffer.from(msg), 0, msg.length, PORT, "192.168.0.255");
    if (pkt < 2) {
      setTimeout(discover, 2500);
      pkt++;
    }
  };
  server.bind(() => {
    server.setBroadcast(true);
    server.on("message", (msg, rinfo) => {
      console.log(
        `broadcast socket got: ${msg} from ${rinfo.address}:${rinfo.port}`
      );
      const data = JSON.parse(msg);
      if (data.result.success) {
        const socket = dgram.createSocket("udp4");
        socket.connect(rinfo.port, rinfo.address);
        socket.on("message", onSocketMessage);
        socket.on("error", onSocketError);
        LIGHTS[rinfo.address] = socket;
      }
    });
    discover();
  });
});

ipcMain.on("getStatus", (event, ip) => {
  msg = JSON.stringify({ method: "getPilot" });
  sendMessage(msg, ip);
});

ipcMain.on("turnOn", (event, ip) => {
  msg = JSON.stringify({ method: "setPilot", params: { state: true } });
  sendMessage(msg, ip);
});

ipcMain.on("turnOff", (event, ip) => {
  msg = JSON.stringify({ method: "setPilot", params: { state: false } });
  sendMessage(msg, ip);
});

ipcMain.on("setBrightness", (event, value, ip) => {
  msg = JSON.stringify({ method: "setPilot", params: { dimming: value } });
  sendMessage(msg, ip);
});

ipcMain.on("setTemp", (event, value, ip) => {
  msg = JSON.stringify({ method: "setPilot", params: { temp: value } });
  sendMessage(msg, ip);
});

ipcMain.on("setColor", (event, value, ip) => {
  msg = JSON.stringify({ method: "setPilot", params: { ...value } });
  sendMessage(msg, ip);
});
