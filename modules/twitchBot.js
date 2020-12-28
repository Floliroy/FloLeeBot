const fs = require('fs')
const {ApiClient} = require('twitch')
const {RefreshableAuthProvider, StaticAuthProvider, ClientCredentialsAuthProvider} = require('twitch-auth')
const {ChatClient} = require('twitch-chat-client')

const STREAM_NAME = "FloLeeroyJ"
const CHANNEL_NAME = "#floleeroyj"

let chatClient
let apiClient

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

    static onMessage(channel, user, message, db){
        if(!message.startsWith("!")) return

        let response = db.twitchCommandes.get(message)
        if(response){
            chatClient.say(channel, response.message)
            console.log(`LOG: ${user} used ${message}`)
        }
    }

    static async randomAds(db){
        if(await isStreamLive()){
            db.adsMessages.shuffle()
            
            chatClient.say(CHANNEL_NAME, db.adsMessages[0])
            console.log(`LOG: Send ${db.adsMessages[0]}`)
        }
    }
}