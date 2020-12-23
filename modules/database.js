const {GoogleSpreadsheet} = require('google-spreadsheet')
const doc = new GoogleSpreadsheet("1N5LovKMhcAin_hRd1ToLMmrRN4tR_ufvaCIcbyts_sw")

module.exports = class Database{

    static async refreshDatas(){
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_EMAIL,
            private_key: process.env.GOOGLE_TOKEN.replace(/\\n/g, '\n')
        })
        await doc.loadInfo()

        let twitchCommandes = new Map()
        const sheetTwitchCMD = doc.sheetsByTitle["TwitchCMD"]
        const rowsTwitchCMD = await sheetTwitchCMD.getRows()
        for(let row of rowsTwitchCMD){
            twitchCommandes.set(row.Commande, {
                message: row.Message
            })
        }

        let discordCommandes = new Map()
        const sheetDiscordCMD = doc.sheetsByTitle["DiscordCMD"]
        const rowsDiscordCMD = await sheetDiscordCMD.getRows()
        for(let row of rowsDiscordCMD){
            discordCommandes.set(row.Commande, {
                message: row.Message,
                titre: row.Titre,
                image: row.Image,
                miniature: row.Miniature == true,
                embed: row.Embed == true
            })
        }

        return {
            twitchCommandes: twitchCommandes, 
            discordCommandes: discordCommandes
        }
    }

}