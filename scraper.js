const request = require('request-promise')
const cheerio = require('cheerio')
const Nightmare = require('nightmare')
const nightmare = Nightmare({ show: true })
const regularRequest = require('request')
const fs = require('fs')

const sampleResult = {
    title: "Bohemian Rhapsody",
    rank: 1,
    imdbRating: 8.4,
    descriptionUrl: "https://m.media-amazon.com/images/M/MV5BY2RmZmI0NDMtMGQzOC00YWU3LTkwYWUtMDRkNDBjZDg3YTkyXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_UX182_CR0,0,182,268_AL_.jpg",
    posterUrl: "https://www.imdb.com/title/tt3661210/mediaviewer/rm4196523009/",
    poseterImageUrl: "https://www.imdb.com/title/tt3661210/mediaviewer/rm4196523009/"
}

async function scrapeTitlesRanksAndRatings() {
    const result = await request.get('https://www.imdb.com/chart/moviemeter/?ref_=nv_mv_mpm')
    const $ = cheerio.load(result)
    const movies = $('tr').map((index, element) => {
        const title = $(element).find('td.titleColumn > a').text()
        const descriptionUrl = "https://www.imdb.com" + $(element).find('td.titleColumn > a').attr('href')
        const imdbRating = $(element).find("td.ratingColumn.imdbRating").text().trim()
        return { title, imdbRating, rank: index, descriptionUrl }
    }).get() //when you use `cheerio` with `map`, don't forget to call `get()`
    return movies
}

/** Take a look at this function **/
async function scrapePosterUrl(movies) {
    //Promise all, This method is useful for when you want to wait for more than one promise to complete
    const moviesWithPosterUrls = await Promise.all(movies.map(async movie => {
        try {
            const html = await request.get(movie.descriptionUrl)
            const $ = cheerio.load(html)
            movie.posterUrl = "https://www.imdb.com" + $('div.poster > a').attr('href')
            return movie
        } catch (error) {
            console.error(error)
        }
    }))
    return moviesWithPosterUrls
}

/** NightmareJs, render javascript-rendered website **/
async function scarpePosterImageUrl(movies) {
    for (let i = 0; i < movies.length; i++) {
        try {
            const posterImageUrl = await nightmare
                .goto(movies[i].posterUrl)
                .evaluate(() =>
                    document
                    .querySelector("#photo-container > div > div:nth-child(2) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)")
                    .getAttribute('src')
                )
            movies[i].posterImageUrl = posterImageUrl
            savePosterImageToDisk(movies[i])
            console.log(movies[i])
        } catch (error) {
            console.error(error)
        }
    }
    return movies
}

//save file with url
async function savePosterImageToDisk(movie) {
    regularRequest
        .get(movie.posterImageUrl)
        .pipe(fs.createWriteStream(`posters/${movie.rank}.png`))
}

async function main() {
    let movies = await scrapeTitlesRanksAndRatings()
    movies = await scrapePosterUrl(movies)
    movies = await scarpePosterImageUrl(movies)
    console.log(movies)
}

main() 


// const Nightmare = require("nightmare");
// const nightmare = Nightmare({ show: true });
// const request = require("request-promise");
// const regularRequest = require("request");
// const cheerio = require("cheerio");
// const fs = require("fs");
// const sampleResult = {
//     title: "Bohemian Rhapsody",
//     rank: 1,
//     rating: "8.4",
//     mediaviewer: "htttps.....",
//     url:
//         "https://www.imdb.com/title/tt1727824/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=ea4e08e1-c8a3-47b5-ac3a-75026647c16e&pf_rd_r=5TXYH4ZPWKCCG20RYSXS&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=moviemeter&ref_=chtmvm_tt_1"
// };
// async function scrape() {
//     const result = await request.get(
//         "https://www.imdb.com/chart/moviemeter?ref_=nv_mv_mpm"
//     );
//     const $ = await cheerio.load(result);
//     const scrapingResults = [];
//     $("table > tbody > tr").each((i, element) => {
//         const url =
//             "https://www.imdb.com" +
//             $(element)
//                 .find("td.titleColumn > a")
//                 .attr("href");
//         const title = $(element)
//             .find("td.titleColumn > a")
//             .text();
//         const rating = $(element)
//             .find(".imdbRating")
//             .text()
//             .trim();
//         const rank = $(element)
//             .find("[name='rk']")
//             .attr("data-value");
//         const scrapingResult = {
//             title,
//             rating,
//             rank,
//             url
//         };
//         scrapingResults.push(scrapingResult);
//     });
//     return scrapingResults;
// }
// async function scrapeMediaviewer(url) {
//     const result = await request.get(url);
//     const $ = await cheerio.load(result);
//     return $(".poster > a").attr("href");
// }
// async function getPosterUrl(scrapingResult) {
//     console.log(scrapingResult);
//     await nightmare.goto(scrapingResult.mediaviewerUrl);
//     const html = await nightmare.evaluate(() => document.body.innerHTML);
//     const $ = await cheerio.load(html);
//     const imageUrl = $(
//         "#photo-container > div > div:nth-child(2) > div > div.pswp__scroll-wrap > div.pswp__container > div:nth-child(2) > div > img:nth-child(2)"
//     ).attr("src");
//     // console.log("rank");
//     // console.log(scrapingResults.rank);
//     return imageUrl;
// }
// async function savePicture(scrapingResult) {
//     regularRequest
//         .get(scrapingResult.posterUrl)
//         .pipe(fs.createWriteStream("posters/" + scrapingResult.rank + ".png"));
// }
// async function main() {
//     const scrapingResults = await scrape();
//     for (var i = 0; i < scrapingResults.length; i++) {
//         try {
//             const mediaviewerUrl = await scrapeMediaviewer(scrapingResults[i].url);
//             scrapingResults[i].mediaviewerUrl =
//                 "https://www.imdb.com" + mediaviewerUrl;
//             console.log(scrapingResults[i]);
//             const posterUrl = await getPosterUrl(scrapingResults[i]);
//             scrapingResults[i].posterUrl = posterUrl;
//             await savePicture(scrapingResults[i]);
//         } catch (err) {
//             console.error(err);
//         }
//     }
//     console.log(scrapingResults);
// }
// main();