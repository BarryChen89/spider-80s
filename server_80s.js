var http = require("http")
var url = require("url")
var path = require('path')
var fs = require("fs")
var jsonfile = require('jsonfile')
var charset = require('superagent-charset')
var superagent = charset(require('superagent'))

// 打开浏览器
var c= require('child_process')

// jquery方法调用
var cheerio = require("cheerio")
// 本地存储路径
var dbname = 'db.json'
var dbPath = path.join(__dirname,dbname)
var db = jsonfile.readFileSync(dbPath)

// 处理异步并发
var async = require("async")
var eventproxy = require('eventproxy')
var ep = new eventproxy()

var catchFirstUrl = 'http://www.80s.tw/movie/list' //入口页面
var urlsArray = [] 	//存放爬取网址

// 循环生成前 n 页的分页地址
var pageUrls = [] 	// 列表地址
var pageNum = 2
for(var i=1 ; i<= pageNum ; i++){
	var _u = catchFirstUrl+'/-----p'+ i
	pageUrls.push(_u)
}

// 存储地址到json文件
function savaPath(name,path){
	var obj = {'name':name,'url':path}
	db['movie'].push(obj)
    jsonfile.writeFileSync(dbname, db,{spaces: 4})
}

// 主程序
module.exports = function(website){
    function onRequest(req, res){
        // 设置字符编码(去掉中文会乱码)
        res.writeHead(200, {'Content-Type': 'text/html'})
        var reptileMove = function(url,callback){
            var delay = parseInt((Math.random() * 30000000) % 1000, 10)
            superagent
                .get(url)
            	//.charset('gbk')
                .end(function(err,sres){
                    if (err) {
                        console.log('load err :'+ url)
                        return
                    }
                    var $ = cheerio.load(sres.text)
                    var articleUrls = $('.me1 a')
                    for(var i = 0 ; i < articleUrls.length ; i+=2){
                        var articleUrl = 'http://www.80s.tw' + $(articleUrls[i]).attr('href')
                        urlsArray.push(articleUrl)
                    }
                })
            setTimeout(function() {
                callback(null,url +'Call back content')
            }, delay)
        }

        // 使用async控制异步抓取
        // mapLimit(arr, limit, iterator, [callback])
        // 异步回调
        async.mapLimit(pageUrls, 5 ,function (url, callback) {
            reptileMove(url, callback)
        }, function (err,result) {
            ep.emit('newsHtml', urlsArray)
            console.log('抓取结束，共获得：'+urlsArray.length + '个电影链接。' )
        })

        // 当所有 'newsHtml' 事件完成后的回调触发下面事件
        ep.after('newsHtml',1,function(newsUrlList){
            console.log('电影列表解析完成，现在开始解析电影页面并存储电影链接')

            //控制并发数
            var reptileMove = function(url,callback){
                var delay = parseInt((Math.random() * 30000000) % 1000, 10)
                superagent.get(url)
                	//.charset('gbk')
                    .end(function(err,sres){
                        if (err) {
                            console.log('load err :'+ url)
                            return
                        }
                        var $ = cheerio.load(sres.text)
                        //收集数据
                        var movieUrl = $('#myform .dlbutton1').find('a').attr('href')
                        var name = $('#minfo h1').text()
                        console.log(name,movieUrl)
                        savaPath(name,movieUrl)
                    })

                setTimeout(function() {
                    callback(null,url +'Call back content')
                }, delay)
            }

            // 使用async控制异步抓取
            // mapLimit(arr, limit, iterator, [callback])
            // 异步回调
            async.mapLimit(urlsArray, 5 ,function (url, callback) {
                reptileMove(url, callback)
            }, function (err,result) {
                console.log('抓取结束，共获得：'+result.length + '个电影链接。' )
            })
        })

    }
    http.createServer(onRequest).listen(3000)

    c.exec('start http://localhost:3000')
}