var express = require("express");
var router = express.Router();

const prisma = require("../prisma/prisma");

const mqttDomain = "178.32.223.217";
const port = 80;
const mqttUri = `mqtt://${mqttDomain}`;
const options = {
    username: "groupe2",
    password: "groupe2",
    port,
    keepalive: 60,
};

const mqtt = require("mqtt").connect(mqttUri, options);

mqtt.on("connect", () => {
    console.log(`Connected to ${mqttUri}`);
    mqtt.subscribe("/groupe2/#", err => {
        if (!err) {
            console.log("Subscribed to /groupe2/#");
        } else {
            console.log("Error while subscribing to /groupe2/#");
        }
    });
});

const map = new Map();
// TODO: Fetch from DB before upserting
mqtt.on("message", async (topic, message) => {
    const name = topic.replace("/groupe2/", "");
    const value = message.toString();

    console.log(`Received message on ${topic}: ${value}`);
    map.set(topic, `${value};;${Date.now()}`);
    const lastUpdate = new Date();
    // Wait a random time to avoid overloading the database
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10000));
    const sent = await prisma.tag.upsert({
        where: {
            name,
        },
        create: {
            name,
            value,
            lastUpdate,
        },
        update: {
            value,
            lastUpdate,
        },
    });
    console.log(`Sent to database: ${JSON.stringify(sent)}`);
});

/* GET users listing. */
router.get("/", function (req, res, next) {
    const json = jsonify(map);
    res.set("Access-Control-Allow-Origin", "*"); // Sets Access-Control-Allow-Origin response header
    res.status(200).json(json);
});

function jsonify(map) {
    return [...map.entries()].reduce((acc, [topic, message]) => {
        const nKey = topic.replace("/groupe2/", "");
        acc[nKey] = message;
        return acc;
    }, {});
}

module.exports = router;
