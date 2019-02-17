const Vue = require('vue')
const server = require('express')()
const app = new Vue({
  data: {
    msg: 'Hello Vue SSR'
  },
  template: `<div>{{msg}}</div>`
})
const renderer = require('vue-server-renderer').createRenderer({
  template: require('fs').readFileSync('./index.html', 'utf-8')
})

server.get('*', (req, res) => {
  renderer.renderToString(app, (err, html) => {
    if (err) {
      console.log(err)
      res.status(500).end('Internal Server Error')
      return
    }
    res.end(html)
  })
})

server.listen(8080)