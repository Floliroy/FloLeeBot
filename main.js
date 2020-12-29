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
setInterval(function(){
    TwitchBot.randomAds(db)
}, 1000 * 60 * 15)

const Discord = require('discord.js')
const bot = new Discord.Client()
bot.login(process.env.DISCORD_TOKEN)

bot.on('ready', async function(){
    console.log(`LOG: Logged in as ${bot.user.tag}`)
    
    db = await Database.refreshDatas()
    const chatClient = await TwitchBot.auth()

    chatClient.onMessage(function(channel, user, message){
        TwitchBot.onMessage(channel, user, message, db)
    })
    chatClient.onSub(function(channel, user){
        TwitchBot.onSub(channel, user)
    })
    chatClient.onResub(function(channel, user, subInfo){
        TwitchBot.onResub(channel, user, subInfo)
    })
    chatClient.onSubGift(function(channel, user, subInfo){
        TwitchBot.onSubGift(channel, user, subInfo)
    })
})

bot.on('message', async function(message){
    if(!message.content.startsWith("!")) return

    if(message.content == "!update"){
        db = await Database.refreshDatas()
    }else{
        let response = db.discordCommandes.get(message.content)
        if(response){
            if(response.embed){
                let embed = new Discord.MessageEmbed()
                    .setTitle(response.titre)
                    .setDescription(response.message)
                if(response.miniature){
                    embed.setThumbnail(response.image)
                }else{
                    embed.setImage(response.image)
                }
                message.channel.send(embed)
            }else{
                message.channel.send(response.message)
            }
        }
    }
})