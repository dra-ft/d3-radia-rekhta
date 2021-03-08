const rp = require('request-promise')
const cheerio = require('cheerio');
const fs = require('fs');

const getLinks = (url) => {
    return rp(url)
    .then((html)=>{
        // console.log(html)
        const $ = cheerio.load(html)
        const nazmLinks = $('div[class=genricMatchCard] > p > a', html).map((i, x) => $(x).attr('href')).toArray()
        return nazmLinks;
    })
    .catch((err) =>{
        console.log('Error: could not fetch HTML ', err)
    })
    
}

const getNazm =  (nazmUrl) => {
    return rp(nazmUrl)
    .then((html) => {
        const $ = cheerio.load(html)
        
        const poemBody = $('.poemPageContentBody')
        return poemBody.text()
    })
    .catch((err)=>{
        console.log('Error : fetching nazm', err)
    })
}

// const SEARCH_TERM = 'water'
// const url = `https://www.rekhta.org/search/nazm?q=${SEARCH_TERM}`

const nazmScraper = (url) => {
    return Promise.resolve(
        getLinks(url)
        .then((links)=>{
            // console.log(links)
            const getNazms = links.map((link) => {
                const fullNazmURL = `https://www.rekhta.org${link}?lang=hi`
                return getNazm(fullNazmURL)
            })
            return Promise.all(getNazms)
            .then((nazms) => {
                // console.log(nazms)
                const nazmTxt = JSON.stringify(nazms,  null, 2);
                const cleanNazmTxt = nazmTxt.replace(/(\r\n|\n|\r)/gm, "");
                return nazms;
                // fs.writeFile('nazms.json', cleanNazmTxt, 'utf8', (err)=>{
                //     if (err){
                //         console.log(err)
                //     }
                // });
            })
        })
        .catch((err) => {
            console.log('Error : Could not fetch nazms')
        })
    )

} 

module.exports = {
    nazmScraper
}

