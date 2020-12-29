const fs = require('fs')
const {ApiClient} = require('twitch')
const {RefreshableAuthProvider, StaticAuthProvider, ClientCredentialsAuthProvider} = require('twitch-auth')
const {ChatClient} = require('twitch-chat-client')

const {Tft} = require('riotgames-gg')
const tft = new Tft({region: "EUW", apikey: process.env.RIOT_TOKEN})

const STREAM_NAME = "FloLeeroyJ"
const CHANNEL_NAME = "#floleeroyj"

let chatClient
let apiClient

const tierShortcuts = new Map()
tierShortcuts.set("CHALLENGER", "Chall")
tierShortcuts.set("GRANDMASTER","GM")
tierShortcuts.set("MASTER",     "Master")
tierShortcuts.set("DIAMOND",    "D")
tierShortcuts.set("PLATINUM",   "P")
tierShortcuts.set("GOLD",       "G")
tierShortcuts.set("SILVER",     "S")
tierShortcuts.set("BRONZE",     "B")
tierShortcuts.set("IRON",       "F")
const rankShortcuts = new Map()
rankShortcuts.set("I",  "1")
rankShortcuts.set("II", "2")
rankShortcuts.set("III","3")
rankShortcuts.set("IV", "4")
const summonersId = new Map()
summonersId.set("Floliroy", "D8Aak1OMXfDAwHi6E11szgcpenyjjliTE6w_pz5hm_UsiBA")
summonersId.set("Usefull RøIe", "kwuQLVqCwkaFKTZhm0v8ni9iO2Wopo0nU4fJ2i8TN-RNKOg-QxC-FR0k")
summonersId.set("Florian166", "93EWCwM35QIyx2w2Z3UuuS8Ek-bqGi33-HEx46bLsAcxALU")
summonersId.set("Floliroy TFT", "uwgi2LHIdHNd2T0tUMeAwm144VoJLl7aiRfKmM35DdPr1aVP0VToOSIN")

/**
 * This function get TFT information about a summoner
 */
async function getTftSummonerByName(name) {
    try{
        const response = await tft.League.entriesByAccId(summonersId.get(name))
        const summoner = response[0]
        
        const div = summoner.tier == "CHALLENGER" || summoner.tier == "GRANDMASTER" || 
                    summoner.tier == "MASTER" ? "" : rankShortcuts.get(summoner.rank)
        const rank = `${tierShortcuts.get(summoner.tier)}${div} ${summoner.leaguePoints}LP`
        return {name: name, rank: rank}
    }catch(err){
        return null
    }
}

/**
 * This function will check if stream is online
 */
async function isStreamLive() {
    const user = await apiClient.helix.users.getUserByName(STREAM_NAME)
	return !user ? false : await user.getStream() !== null
}

/**
 * This method will randomize the order of the array
 */
Array.prototype.shuffle = function(){
    for(let i=this.length-1 ; i>0 ; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        let temp = this[i]
        this[i] = this[j]
        this[j] = temp
    }
}

module.exports = class TwitchBot{

    static async auth(){
        const clientId = process.env.TWITCH_CLIENT_ID
        const clientSecret = process.env.TWITCH_CLIENT_SECRET

        const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret)
        apiClient = new ApiClient({authProvider})

        const tokenData = JSON.parse(fs.readFileSync("./config.json", "UTF-8"))
        const auth = new RefreshableAuthProvider(
            new StaticAuthProvider(clientId, tokenData.accessToken), {
                clientSecret, refreshToken: tokenData.refreshToken,
                expiry: tokenData.expiryTimestamp === null ? null : new Date(tokenData.expiryTimestamp),
                onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
                    const newTokenData = {
                        accessToken, refreshToken,
                        expiryTimestamp: expiryDate === null ? null : expiryDate.getTime()
                    }
                    fs.writeFileSync("./config.json", JSON.stringify(newTokenData, null, 4), "UTF-8")
                }
            }
        )

        chatClient = new ChatClient(auth, {channels: [STREAM_NAME]})
        await chatClient.connect()
        return chatClient
    }

    static async onMessage(channel, user, message, db){
        if(!message.startsWith("!")) return

        if(message == "!elo"){
            const summoner = await getTftSummonerByName("Floliroy")
            if(summoner){
                chatClient.say(channel, `Je suis actuellement ${summoner.rank}`)
            }
        }else if(message == "!elo all"){
            const summonersName = new Array("Floliroy", "Usefull RøIe", "Florian166", "Floliroy TFT")
            let response = ""
            for await(let summonerName of summonersName){
                const summoner = await getTftSummonerByName(summonerName)
                if(summoner){
                    response += `${summoner.name} - ${summoner.rank} || `
                }
            }
            if(response != ""){
                response = response.slice(0, -3)
                chatClient.say(channel, response)
            }
        }else{
            let response = db.twitchCommandes.get(message)
            if(response){
                chatClient.say(channel, response.message)
            }
        }

        console.log(`LOG: ${user} used ${message}`)
    }

    static onSub(channel, user){
        chatClient.say(channel, `Merci @${user} pour ton sub et ton soutien !`);
    }
    static onResub(channel, user, subInfo){
        chatClient.say(channel, `Merci @${user} pour ton ${subInfo.months}ème mois d'abonnement !`);
    }
    static onSubGift(channel, user, subInfo){
        chatClient.say(channel, `Merci ${subInfo.gifter} d'avoir offert un sub à ${user} !`);
    }

    static async randomAds(db){
        if(await isStreamLive()){
            db.adsMessages.shuffle()
            
            chatClient.say(CHANNEL_NAME, db.adsMessages[0])
            console.log(`LOG: Send ${db.adsMessages[0]}`)
        }
    }
}