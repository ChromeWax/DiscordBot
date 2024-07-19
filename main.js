const { Client, Events, GatewayIntentBits, Partials } = require("discord.js");
const { token } = require('./config.json');
const spawn = require("child_process").spawn;
const { DisTube, DisTubeHandler, default: dist } = require("distube");

const client = new Client({ 
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

const distube = new DisTube(client, {
    searchSongs: 5,
	searchCooldown: 30,
    nsfw: true,
});

const prefix = "!cb ";

let current = "Nothing";
let job = null;
let backupProcess = null;
let backupBeingProcessed = false;
let updateBeingProcessed = false;

client.once(Events.ClientReady, () => {
    console.log("Bot Engaged");
    client.user.setActivity("Bot Engaged | !cb help");
});

client.on(Events.MessageCreate, async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    let tokens = message.content.slice(prefix.length).split(" ");
    let command = tokens.shift();
    command = command.toLowerCase();

    if (command === "start") {
        let game = tokens.shift(); 
        game = game.toLowerCase();

        if (game === current) {
            message.channel.send("Already running");
        }
        else if (game === "minecraft") {
            launchJob(message, "bash", ["/home/chromewax/minecraft/launch.bash"], "Minecraft", "/home/chromewax/minecraft");
        }
        else if (game === "palworld") {
            launchJob(message, "bash", ["/home/chromewax/Steam/steamapps/common/PalServer/PalServer.sh", "-useperfthreads", "-NoAsyncLoadingThread", "-UseMultithreadForDS"], "Palworld", "/home/chromewax/Steam/steamapps/common/PalServer");
        }
        else {
            message.channel.send("Command not found");
        }
    }
    else if (command === "backup") {
        backup(message);
    }
    else if (command === "stop") {
        killJob();
        message.channel.send("Stopping all servers");
    }
    else if (command === "update") {
        update(message);
    }
    else if (command === "status") {
	    message.channel.send(current + " is currently running");
    }
    else if (command === "play") {
        const voiceChannel = message.member?.voice?.channel;

        if (tokens.join(" ") === "") {
			message.channel.send("No song is playing");
            return;
        }

		if (voiceChannel) {
			distube.play(voiceChannel, tokens.join(' '), {
				message,
				textChannel: message.channel,
				member: message.member,
			});
            message.channel.send("Added: " + tokens.join(" "));
		} 
        else {
			message.channel.send("You must join a voice channel first");
		}
    }
    else if (command === "queue") {
        queue = distube.getQueue(message.guildId);
        if (queue === undefined) 
            return;

        songs = queue.songs;
        queueString = "";
        for (let i = 0; i < songs.length; i++) {
            if (i === 0)

                queueString += "Current Song: " + songs[i].name + "\n";
            else
                queueString += i + ": " + songs[i].name + "\n";
        }
        message.channel.send(queueString);
    }
    else if (command === "resume") {
        queue = distube.getQueue(message.guildId);
        if (queue === undefined) 
            return;

        if (queue.playing === true)
            return;

        distube.resume(message.guildId);
        message.channel.send("Resumed song");
    }
    else if (command === "pause") {
        queue = distube.getQueue(message.guildId);
        if (queue === undefined) 
            return;

        if (queue.playing === false)
            return;

        distube.pause(message.guildId);
        message.channel.send("Paused song");
    }
    else if (command === "skip") {
        queue = distube.getQueue(message.guildId);
        if (queue === undefined) 
            return;

        songs = queue.songs;
        if (songs.length === 1) 
            distube.stop(message.guildId);
        else
            distube.skip(message.guildId);

        message.channel.send("Skipped song");
    }
    else if (command === "disconnect") {
        queue = distube.getQueue(message.guildId);
        if (queue === undefined) 
            return;

        distube.stop(message.guildId);
        message.channel.send("Disconnected from channel");
    }
    else {
        message.channel.send("Command not found");
    }
});

client.login(token);

function launchJob(message, program, args, game, currentdirectory) {
    killJob();

    if (args !== null) {
        job = spawn(program, args, {detached: true, cwd: currentdirectory});
    }
    else {
        job = spawn(program, [], {detached: true});
    }

    job.stdout.on("data", (data) => {console.log(`stdout: ${data}`);});
    job.stderr.on("data", (data) => {console.log(`stderr: ${data}`);});
    job.on("close", (code) => {console.log(`child process exited with code ${code}`);});

    current = game;
    message.channel.send("Please wait! Launching " + game);
}

function killJob() {
    try {
	    process.kill(-job.pid);
        current = "Nothing";
    }
    catch (err) {}
}

function backup(message) {
    if (backupBeingProcessed === false) {
        backupBeingProcessed = true;
        message.channel.send("Backup is being processed, please wait! Confirmation will come when finished");

        backupProcess = spawn("bash", ["/home/chromewax/discordBot/backupGames.bash"], {detached: true})
        backupProcess.on("close", function() {
            backupBeingProcessed = false;
            message.channel.send("Backup finished!");
        });
    }
    else {
        message.channel.send("Backup is still being processed, please wait!");
    }
}

function update(message) {
    if (updateBeingProcessed === false) {
        killJob();
        updateBeingProcessed = true;
        message.channel.send("Updating all game servers, please wait! Must shut down current game server. Confirmation will come when finished");

        updateProcess = spawn("bash", ["/home/chromewax/discordBot/updateGames.bash"], {detached: true})
        updateProcess.on("close", function() {
            updateBeingProcessed = false;
            message.channel.send("Update is finished! Please relaunch the server");
        });
    }
    else {
        message.channel.send("Update is still being processed, please wait!");
    }
}
