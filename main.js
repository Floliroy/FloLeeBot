require('dotenv').config()

const basicConsole = console.log
Date.prototype.format = function(){
    return this.toLocaleDateString('fr-FR', { 'timeZone': 'Europe/Paris', 
        'day': '2-digit', 'month': '2-digit', 'year': 'numeric', 
        'hour': '2-digit', 'minute': '2-digit', 'second': '2-digit', 'hour12': false 
    }).replace('à', '-')
}
console.log = function(){
    const date = `[${new Date().format()}]`
    Array.prototype.unshift.call(arguments, date)
    basicConsole.apply(this, arguments)
}

const fs = require('fs')
const {RefreshableAuthProvider, StaticAuthProvider} = require('twitch-auth')
const {ChatClient} = require('twitch-chat-client')

const Database = require('./modules/database.js')
let db

async function auth(){
    const clientId = process.env.TWITCH_CLIENT_ID
    const clientSecret = process.env.TWITCH_CLIENT_SECRET
    const tokenData = JSON.parse(fs.readFileSync('./config.json', 'UTF-8'))
    const auth = new RefreshableAuthProvider(
        new StaticAuthProvider(clientId, tokenData.accessToken), {
            clientSecret, refreshToken: tokenData.refreshToken,
            expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
            onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
                const newTokenData = {
                    accessToken, refreshToken,
                    expiryTimestamp: expiryDate === null ? null : expiryDate.getTime()
                }
                fs.writeFileSync('./config.json', JSON.stringify(newTokenData, null, 4), 'UTF-8')
            }
        }
    )

    const chatClient = new ChatClient(auth, {channels: ['FloLeeroyJ']})
    await chatClient.connect()
    return chatClient
}

async function start(){
    db = await Database.refreshDatas()
    const chatClient = await auth()

    console.log("Ready to Go !")

    chatClient.onMessage(function(channel, user, message){
        if(!message.startsWith("!")) return

        let response
        if(response = db.twitchCommandes.get(message)) {
            chatClient.say(channel, response.message)
            console.log(`LOG : ${user} used ${message}`)
        }
    })
}

start()
//FloLeeroyJ ID = 65939894