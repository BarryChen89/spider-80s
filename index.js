#!/usr/bin/env node

// 解析终端输入信息
var program = require('commander')
var server_80s = require('./server_80s')

program
    .command('spider <website>')
    .action(function(website){
        if(website == '80s') {
            server_80s(website);
        }
    })

program.parse(process.argv)
