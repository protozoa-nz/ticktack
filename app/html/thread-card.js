var h = require('mutant/h')
const last = require('lodash/last')

exports.gives = {
  app: {html: {threadCard: true}}
}

exports.needs = {
  keys: {sync: {id: 'first'}},
  history: {sync: {push: 'first'}},
  about: {
    obs: {name: 'first'},
    html: {image: 'first'},
  },
  message: {html: {markdown: 'first'}},
  translations: {sync: {strings: 'first'}},
}

function isString (s) {
  return 'string' === typeof s
}

function firstLine (text) {
  if(text.length < 80 && !~text.indexOf('\n')) return text

  var line = ''
  var lineNumber = 0
  while (line.length === 0) {
    const rawLine = text.split('\n')[lineNumber]
    line = trimLeadingMentions(rawLine)

    lineNumber++
  }

  var sample = line.substring(0, 80)
  if (hasBrokenLink(sample))
    sample = sample + line.substring(81).match(/[^\)]*\)/)[0]

  return sample

  function trimLeadingMentions (str) {
    return str.replace(/^(\s*\[@[^\)]+\)\s*)*/, '')
    // deletes any number of pattern " [@...)  " from start of line
  }

  function hasBrokenLink (str) {
    return /\[[^\]]*\]\([^\)]*$/.test(str)
    // matches "[name](start_of_link"
  }
}

exports.create = function (api) {

  //render the icon for a thread.
  //it would be more depjecty to split this
  //into two methods, one in a private plugin
  //one in a channel plugin
  function threadIcon (msg) {
    if(msg.value.private) {
      const myId = api.keys.sync.id()

      return msg.value.content.recps
        .map(link => isString(link) ? link : link.link)
        .filter(link => link !== myId)
        .map(api.about.html.image)
    }
    else if(msg.value.content.channel)
      return '#'+msg.value.content.channel
  }


  // REFACTOR: move this to a template?
  function buildRecipientNames (thread) {
    const myId = api.keys.sync.id()

    return thread.value.content.recps
      .map(link => isString(link) ? link : link.link)
      .filter(link => link !== myId)
      .map(api.about.obs.name)
  }

  function link(location) {
    return {'ev-click': () => api.history.sync.push(location)}
  }

  function subject (msg) {
    const { subject, text } = msg.value.content
    if(!(subject||text)) debugger
    return api.message.html.markdown(firstLine(subject|| text))
  }

  return {app: {html: {threadCard: function (_, thread, opts = {}) {
    var strings = api.translations.sync.strings()

    if(!thread.value) return
    if(!thread.value.content.text) return

    const subjectEl = h('div.subject', [
      opts.nameRecipients
        ?  h('div.recps', buildRecipientNames(thread).map(recp => h('div.recp', recp)))
        : null,
      subject(thread)
    ])

    const lastReply = thread.replies && last(thread.replies)
    const replyEl = lastReply
      ? h('div.reply', [
          h('div.replySymbol', strings.replySymbol),
          subject(lastReply)
        ])
      : null

    return h('div.thread', link(thread), [
      //h('div.context', context),
      h('div.context', threadIcon(thread)),
      h('div.content', [
        subjectEl,
        replyEl
      ])
    ])
  }}}}
}


