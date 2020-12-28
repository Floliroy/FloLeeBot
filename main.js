require('dotenv').config()

/**
 * Change console.log
 */
const basicConsole = console.log
Date.prototype.format = function(){
    return this.toLocaleDateString('fr-FR', { 'timeZone': 'Europe/Paris', 
        'day': '2-digit', 'month': '2-digit', 'year': 'numeric', 
        'hour': '2-digit', 'minute': '2-digit', 'second': '2-digit', 'hour12': false 
    }).replace(', ', ' - ')
}
console.log = function(){
    const date = `[${new Date().format()}]`
    Array.prototype.unshift.call(arguments, date)
    basicConsole.apply(this, arguments)
}

/**
 * Libraries
 */
const Database = require('./modules/database.js')
let db
setInterval(async function(){
    db = await Database.refreshDatas()
}, 1000 * 60 * 60)

const TwitchBot = require('./modules/twitchBot.js')

/**
 * Async init function
 */
async function init(){
    db = await Database.refreshDatas()
    const chatClient = await TwitchBot.auth()

    chatClient.onMessage(function(channel, user, message){
        TwitchBot.onMessage(channel, user, message, db)
    })

    setInterval(function(){
        TwitchBot.randomAds(db)
    }, 1000 * 60 * 15)

    console.log("LOG: Ready to Go !")
}
init()