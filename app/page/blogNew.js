const nest = require('depnest')
const { h, Struct, Value } = require('mutant')
const addSuggest = require('suggest-box')

exports.gives = nest('app.page.blogNew')

exports.needs = nest({
  'app.html.context': 'first',
  'channel.async.suggest': 'first',
  'history.sync.push': 'first',
  'message.html.compose': 'first',
  'translations.sync.strings': 'first',
})

exports.create = (api) => {
  var contentHtmlObs

  return nest('app.page.blogNew', blogNew)
  
  function blogNew (location) {
    const strings = api.translations.sync.strings()
    const getChannelSuggestions = api.channel.async.suggest()

    const meta = Struct({
      type: 'blog',
      channel: Value(),
      title: Value(),
    })

    const composer = api.message.html.compose(
      { meta, shrink: false },
      (err, msg) => api.history.sync.push(err ? err : msg)
    )

    const channelInput = h('input', {
      'ev-input': e => meta.channel.set(e.target.value),
      placeholder: strings.channel
    })
    var page = h('Page -blogNew', [
      api.app.html.context(location),
      h('div.content', [
        h('div.field -channel', [
          h('div.label', strings.channel),
          channelInput
        ]),
        h('div.field -title', [
          h('div.label', strings.blogNew.field.title),
          h('input', {
            'ev-input': e => meta.title.set(e.target.value),
            placeholder: strings.blogNew.field.title
          }),
        ]),
        composer
      ])
    ])

    addSuggest(channelInput, (inputText, cb) => {
      var suggestions = getChannelSuggestions(inputText)
        .map(s => {
          s.value = s.value.replace(/^#/, '') // strip the defualt # prefix here
          return s
        })
        .map(s => {
          if (s.subtitle === 'subscribed')
            s.subtitle = h('i.fa.fa-heart') // TODO - translation-friendly subscribed
          return s
        })

      // HACK add the input text if it's not an option already
      if (!suggestions.some(s => s.title === inputText)) {
        suggestions.push({
          title: inputText,
          subtitle: h('i.fa.fa-plus-circle'),
          value: inputText
        })
      }

      cb(null, suggestions)
    }, {cls: 'PatchSuggest.-channelHorizontal'}) // WARNING hacking suggest-box cls

    channelInput.addEventListener('suggestselect', (e) => channel.set(e.value))

    return page
  }
}
