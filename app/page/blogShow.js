const nest = require('depnest')
const { h, computed, when } = require('mutant')
const { title: getTitle } = require('markdown-summary')
const last = require('lodash/last')
const get = require('lodash/get')

exports.gives = nest('app.page.blogShow')

exports.needs = nest({
  'about.html.avatar': 'first',
  'about.obs.name': 'first',
  'app.html.comments': 'first',
  'app.html.context': 'first',
  'contact.html.follow': 'first',
  'message.html.channel': 'first',
  'message.html.markdown': 'first',
  'message.html.timeago': 'first',
  'feed.obs.thread': 'first'
})

exports.create = (api) => {
  return nest('app.page.blogShow', blogShow)

  function blogShow (blogMsg) {
    // blogMsg = a thread (message, may be decorated with replies)

    const { author, content } = blogMsg.value

    const blog = content.text
    const title = api.message.html.markdown(content.title || getTitle(blog))

    const comments = api.app.html.comments(blogMsg.key)

    const { lastId: branch } = api.feed.obs.thread(blogMsg.key)

    const { timeago, channel, markdown, compose } = api.message.html

    // return api.app.html.scroller({
    //   classList: [ 'level', '-one' ],
    //   prepend,
    //   stream: api.feed.pull.private,
    //   filter: () => pull(
    //     pull.filter(msg => msg.value.content.type === 'post'), // TODO is this the best way to protect against votes?
    //     pull.filter(msg => msg.value.author != myKey),
    //     pull.filter(msg => msg.value.content.recps)
    //   ),
    //   store: recentMsgCache,
    //   updateTop: updateRecentMsgCache,
    //   updateBottom: updateRecentMsgCache,
    //   render: (msgObs) => {
    //     const msg = resolve(msgObs)
    //     const { author } = msg.value
    //     if (nearby.has(author)) return

    //     return Option({
    //       notifications: Math.random() > 0.7 ? Math.floor(Math.random()*9+1) : 0, // TODO
    //       imageEl: api.about.html.avatar(author),
    //       label: api.about.obs.name(author),
    //       selected: location.feed === author,
    //       location: Object.assign({}, msg, { feed: author }) // TODO make obs?
    //     })
    //   }
    // })
    return h('Page -blogShow', [
      api.app.html.context({ page: 'discover' }), // HACK to highlight discover
      h('div.content', [
        h('header', [
          h('div.blog', [
            h('h1', title),
            timeago(blogMsg),
            channel(blogMsg)
          ]),
          h('div.author', [
            h('div.leftCol', api.about.html.avatar(author, 'medium')),
            h('div.rightCol', [
              h('div.name', api.about.obs.name(author)),
              api.contact.html.follow(author)
            ]),
          ])
        ]),
        h('div.break', h('hr')),
        h('section.blog', markdown(blog)),
        comments,
      ]),
    ])
  }
}

